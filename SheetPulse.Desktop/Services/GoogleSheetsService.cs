using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Auth.OAuth2.Responses;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;
using SheetPulse.Desktop.Models;

namespace SheetPulse.Desktop.Services;

public class SheetsFetchResult
{
    public bool Success { get; set; }
    public string Status { get; set; } = "NOT_CONFIGURED"; // CONNECTED, ERROR, NOT_CONFIGURED
    public string Message { get; set; } = string.Empty;
    public int Count { get; set; }
    public int TotalBranches { get; set; }
    public int ConnectedBranches { get; set; }
    public List<Student> Students { get; set; } = new();
    public List<Student> Today { get; set; } = new();
    public List<Student> Upcoming { get; set; } = new();
}

public class GoogleSheetsService
{
    private readonly SettingsService _settingsService;
    private readonly LedgerService _ledgerService;
    private SheetsFetchResult? _cachedResult;
    private DateTime _cacheTimestamp = DateTime.MinValue;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(2);

    public GoogleSheetsService(SettingsService settingsService, LedgerService ledgerService)
    {
        _settingsService = settingsService;
        _ledgerService = ledgerService;
    }

    public void InvalidateCache()
    {
        _cachedResult = null;
    }

    public async Task<SheetsFetchResult> FetchAllStudentsAsync(bool forceRefresh = false)
    {
        if (!forceRefresh && _cachedResult != null && (DateTime.UtcNow - _cacheTimestamp) < CacheDuration)
        {
            return _cachedResult;
        }

        var settings = _settingsService.GetSettings();
        var branches = settings.Branches.Where(b => b.Enabled).ToList();

        if (branches.Count == 0)
        {
            return new SheetsFetchResult
            {
                Success = false,
                Status = "NOT_CONFIGURED",
                Message = "No active branch sheets configured. Open Settings to add branches."
            };
        }

        var client = CreateSheetsClient();
        if (client == null)
        {
            return new SheetsFetchResult
            {
                Success = false,
                Status = "AUTH_REQUIRED",
                Message = "Google Authentication missing. Please verify token in data/google_token.json."
            };
        }

        var allStudents = new List<Student>();
        int connected = 0;

        foreach (var branch in branches)
        {
            try
            {
                var branchStudents = await FetchBranchStudentsAsync(client, branch);
                allStudents.AddRange(branchStudents);
                connected++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GoogleSheets] Branch '{branch.Name}' error: {ex.Message}");
            }
        }

        var categorized = CategorizeStudents(allStudents);

        var result = new SheetsFetchResult
        {
            Success = connected > 0,
            Status = connected > 0 ? "CONNECTED" : "ERROR",
            Count = allStudents.Count,
            TotalBranches = branches.Count,
            ConnectedBranches = connected,
            Students = allStudents,
            Today = categorized.Today,
            Upcoming = categorized.Upcoming,
            Message = connected > 0 
                ? $"Synced {allStudents.Count} students across {connected}/{branches.Count} active branch(es)."
                : "Failed to connect to configured branch sheets."
        };

        _cachedResult = result;
        _cacheTimestamp = DateTime.UtcNow;
        return result;
    }

    private async Task<List<Student>> FetchBranchStudentsAsync(SheetsService client, BranchConfig branch)
    {
        var spreadsheetId = ExtractSpreadsheetId(branch.SheetUrl);
        if (string.IsNullOrEmpty(spreadsheetId))
        {
            throw new ArgumentException("Invalid Google Sheet URL format.");
        }

        // Fetch sheet values
        var range = $"{branch.SheetName}!A1:Z600";
        ValueRange response;
        try
        {
            var req = client.Spreadsheets.Values.Get(spreadsheetId, range);
            response = await req.ExecuteAsync();
        }
        catch
        {
            // Fallback to fetch first sheet
            var metaReq = client.Spreadsheets.Get(spreadsheetId);
            var meta = await metaReq.ExecuteAsync();
            var firstSheet = meta.Sheets?.FirstOrDefault()?.Properties?.Title ?? "Sheet1";
            var fallbackReq = client.Spreadsheets.Values.Get(spreadsheetId, $"{firstSheet}!A1:Z600");
            response = await fallbackReq.ExecuteAsync();
        }

        var rows = response.Values;
        if (rows == null || rows.Count == 0) return new List<Student>();

        // Detect columns from rows
        var mapping = DetectColumns(rows);
        var students = new List<Student>();

        for (int i = mapping.HeaderRowIdx + 1; i < rows.Count; i++)
        {
            var row = rows[i];
            if (row == null || row.Count == 0) continue;

            string nameRaw = mapping.NameIdx >= 0 && mapping.NameIdx < row.Count ? row[mapping.NameIdx]?.ToString()?.Trim() ?? "" : "";
            string dobRaw = mapping.DobIdx >= 0 && mapping.DobIdx < row.Count ? row[mapping.DobIdx]?.ToString()?.Trim() ?? "" : "";
            string phoneRaw = mapping.PhoneIdx >= 0 && mapping.PhoneIdx < row.Count ? row[mapping.PhoneIdx]?.ToString()?.Trim() ?? "" : "";

            if (string.IsNullOrWhiteSpace(dobRaw) && string.IsNullOrWhiteSpace(phoneRaw)) continue;

            var phoneSanitized = PhoneSanitizer.Sanitize(phoneRaw);
            var parsedDob = DobParser.Parse(dobRaw);

            string studentName = !string.IsNullOrWhiteSpace(nameRaw) ? nameRaw : $"Inquirer ({phoneRaw})";

            students.Add(new Student
            {
                Id = $"{branch.Id}_row_{i + 1}",
                Name = studentName,
                FirstName = studentName.Split(' ')[0],
                Phone = phoneSanitized.Sanitized,
                PhoneRaw = phoneRaw,
                PhoneDisplay = phoneSanitized.FormattedDisplay,
                IsPhoneValid = phoneSanitized.IsValid,
                DobRaw = dobRaw,
                DobFormatted = parsedDob.IsValid ? parsedDob.Formatted : dobRaw,
                BirthYear = parsedDob.Year,
                Age = parsedDob.Age,
                Branch = branch.Name,
                BranchId = branch.Id,
                BranchCustomTemplate = branch.CustomTemplate,
                DaysUntil = parsedDob.DaysUntil
            });
        }

        return students;
    }

    private (List<Student> Today, List<Student> Upcoming) CategorizeStudents(List<Student> students)
    {
        var now = DobParser.GetNowInTimezone();
        var today = new List<Student>();
        var upcoming = new List<Student>();

        foreach (var s in students)
        {
            var dob = DobParser.Parse(s.DobRaw);
            if (!dob.IsValid) continue;

            s.DaysUntil = dob.DaysUntil;
            s.DobFormatted = dob.Formatted;
            s.Age = dob.Age;

            if (dob.IsToday)
            {
                bool alreadySent = _ledgerService.HasBeenSentThisYear(s.Phone, now.Year);
                s.Status = alreadySent ? "SENT_TODAY" : "PENDING_TODAY";
                today.Add(s);
            }
            else if (dob.DaysUntil > 0 && dob.DaysUntil <= 7)
            {
                s.Status = "UPCOMING";
                upcoming.Add(s);
            }
        }

        return (
            today.OrderBy(s => s.Status == "PENDING_TODAY" ? 0 : 1).ThenBy(s => s.Name).ToList(),
            upcoming.OrderBy(s => s.DaysUntil).ThenBy(s => s.Name).ToList()
        );
    }

    private static (int NameIdx, int DobIdx, int PhoneIdx, int HeaderRowIdx) DetectColumns(IList<IList<object>> rows)
    {
        int nameIdx = -1, dobIdx = -1, phoneIdx = -1, headerIdx = 0;

        for (int r = 0; r < Math.Min(rows.Count, 5); r++)
        {
            var row = rows[r];
            for (int c = 0; c < row.Count; c++)
            {
                var val = row[c]?.ToString()?.ToLowerInvariant() ?? "";
                if (nameIdx < 0 && (val.Contains("student name") || val.Contains("child name") || val.Contains("name of the child") || val.Contains("inquirer name") || val == "name"))
                    nameIdx = c;
                if (dobIdx < 0 && (val.Contains("date of birth") || val.Contains("birth") || val.Contains("dob") || val.Contains("d.o.b")))
                    dobIdx = c;
                if (phoneIdx < 0 && (val.Contains("contact") || val.Contains("mobile") || val.Contains("phone") || val.Contains("whatsapp") || val.Contains("tp") || val.Contains("tel")))
                    phoneIdx = c;
            }

            if (dobIdx >= 0 || phoneIdx >= 0)
            {
                headerIdx = r;
                break;
            }
        }

        return (nameIdx, dobIdx, phoneIdx, headerIdx);
    }

    private SheetsService? CreateSheetsClient()
    {
        var tokenPath = ResolveTokenPath();
        if (!File.Exists(tokenPath)) return null;

        try
        {
            var json = File.ReadAllText(tokenPath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // Check OAuth user token or service account
            if (root.TryGetProperty("access_token", out var accessProp) && !string.IsNullOrEmpty(accessProp.GetString()))
            {
                var credential = GoogleCredential.FromAccessToken(accessProp.GetString());
                return new SheetsService(new BaseClientService.Initializer { HttpClientInitializer = credential, ApplicationName = "SheetPulse" });
            }

            if (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "service_account")
            {
                var credential = GoogleCredential.FromJson(json).CreateScoped(SheetsService.Scope.SpreadsheetsReadonly);
                return new SheetsService(new BaseClientService.Initializer { HttpClientInitializer = credential, ApplicationName = "SheetPulse" });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[GoogleSheets] Auth error: {ex.Message}");
        }

        return null;
    }

    private static string ExtractSpreadsheetId(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return string.Empty;
        var match = Regex.Match(url, @"/d/([a-zA-Z0-9-_]+)");
        return match.Success ? match.Groups[1].Value : url.Trim();
    }

    private static string ResolveTokenPath()
    {
        var baseDirs = new[]
        {
            Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..")),
            AppDomain.CurrentDomain.BaseDirectory,
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse")
        };

        foreach (var dir in baseDirs)
        {
            var target = Path.Combine(dir, "data", "google_token.json");
            if (File.Exists(target)) return target;
        }

        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse", "data", "google_token.json");
    }
}
