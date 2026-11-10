using System.IO;
using System.Text.Json;
using SheetPulse.Desktop.Models;

namespace SheetPulse.Desktop.Services;

public class LedgerService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly string _ledgerFilePath;
    private readonly object _lock = new();

    public LedgerService()
    {
        _ledgerFilePath = ResolveLedgerPath();
    }

    public bool HasBeenSentThisYear(string phone, int year)
    {
        lock (_lock)
        {
            var container = LoadLedger();
            var key = $"{phone}_{year}";
            return container.Records.ContainsKey(key);
        }
    }

    public void RecordSent(string phone, string name, int year, string message, string method = "SheetPulse .NET")
    {
        lock (_lock)
        {
            var container = LoadLedger();
            var key = $"{phone}_{year}";
            var now = DateTime.UtcNow;
            var today = DobParser.GetNowInTimezone();

            container.Records[key] = new SentRecord
            {
                Key = key,
                Phone = phone,
                Name = name,
                Year = year,
                DateSent = today.ToString("yyyy-MM-dd"),
                Timestamp = now.ToString("o"),
                Status = "SENT",
                Method = method,
                MessagePreview = message.Length > 80 ? message[..80] + "..." : message
            };

            container.UpdatedAt = now.ToString("o");
            SaveLedger(container);
        }
    }

    public List<SentRecord> GetAllRecords()
    {
        lock (_lock)
        {
            var container = LoadLedger();
            return container.Records.Values
                .OrderByDescending(r => r.Timestamp)
                .ToList();
        }
    }

    public string ExportCsv()
    {
        var records = GetAllRecords();
        var lines = new List<string> { "Phone,Name,Year,Date Sent,Timestamp,Status,Method,Message Preview" };

        foreach (var r in records)
        {
            var cleanMsg = (r.MessagePreview ?? "").Replace("\"", "\"\"");
            lines.Add($"\"{r.Phone}\",\"{r.Name}\",{r.Year},\"{r.DateSent}\",\"{r.Timestamp}\",\"{r.Status}\",\"{r.Method}\",\"{cleanMsg}\"");
        }

        return string.Join(Environment.NewLine, lines);
    }

    private LedgerContainer LoadLedger()
    {
        try
        {
            if (File.Exists(_ledgerFilePath))
            {
                var json = File.ReadAllText(_ledgerFilePath);
                var loaded = JsonSerializer.Deserialize<LedgerContainer>(json);
                if (loaded != null) return loaded;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Ledger] Error reading ledger: {ex.Message}");
        }

        return new LedgerContainer();
    }

    private void SaveLedger(LedgerContainer container)
    {
        try
        {
            var dir = Path.GetDirectoryName(_ledgerFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(container, JsonOptions);
            File.WriteAllText(_ledgerFilePath, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Ledger] Error saving ledger: {ex.Message}");
        }
    }

    private static string ResolveLedgerPath()
    {
        var baseDirs = new[]
        {
            Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..")),
            AppDomain.CurrentDomain.BaseDirectory,
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse")
        };

        foreach (var dir in baseDirs)
        {
            var target = Path.Combine(dir, "data", "sent_log.json");
            if (File.Exists(target)) return target;
        }

        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse", "data", "sent_log.json");
    }
}

