using System.Globalization;

namespace SheetPulse.Desktop.Services;

public class ParsedDobResult
{
    public bool IsValid { get; set; }
    public int Day { get; set; }
    public int Month { get; set; }
    public int? Year { get; set; }
    public int? Age { get; set; }
    public string Formatted { get; set; } = string.Empty;
    public bool IsToday { get; set; }
    public int DaysUntil { get; set; }
}

public static class DobParser
{
    private static readonly TimeZoneInfo ColomboTz = GetColomboTimeZone();

    private static TimeZoneInfo GetColomboTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Sri Lanka Standard Time"); } catch {}
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo"); } catch {}
        return TimeZoneInfo.CreateCustomTimeZone("Asia/Colombo", TimeSpan.FromHours(5.5), "Sri Lanka Standard Time", "Sri Lanka Standard Time");
    }

    public static DateTime GetNowInTimezone()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ColomboTz);
    }

    public static ParsedDobResult Parse(string? rawInput)
    {
        if (string.IsNullOrWhiteSpace(rawInput))
        {
            return new ParsedDobResult { IsValid = false };
        }

        var trimmed = rawInput.Trim();
        var now = GetNowInTimezone();

        // 1. Check Excel serial date number
        if (double.TryParse(trimmed, NumberStyles.Any, CultureInfo.InvariantCulture, out double serial) && serial > 1000 && serial < 100000)
        {
            try
            {
                // Excel base date Dec 30, 1899
                var excelDate = new DateTime(1899, 12, 30).AddDays(serial);
                return BuildResult(excelDate.Day, excelDate.Month, excelDate.Year, now);
            }
            catch {}
        }

        // 2. Standard formats
        string[] formats = 
        [
            "d/M/yyyy", "dd/MM/yyyy", "d-M-yyyy", "dd-MM-yyyy",
            "yyyy-MM-dd", "yyyy/MM/dd", "yyyy-M-d", "yyyy/M/d",
            "d.M.yyyy", "dd.MM.yyyy", "M/d/yyyy", "MM/dd/yyyy"
        ];

        if (DateTime.TryParseExact(trimmed, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateTime parsed))
        {
            return BuildResult(parsed.Day, parsed.Month, parsed.Year, now);
        }

        // General fallback
        if (DateTime.TryParse(trimmed, CultureInfo.CurrentCulture, DateTimeStyles.None, out DateTime genericParsed))
        {
            return BuildResult(genericParsed.Day, genericParsed.Month, genericParsed.Year, now);
        }

        return new ParsedDobResult { IsValid = false };
    }

    private static ParsedDobResult BuildResult(int day, int month, int year, DateTime now)
    {
        int? age = null;
        if (year > 1900 && year <= now.Year)
        {
            age = now.Year - year;
            if (now.Month < month || (now.Month == month && now.Day < day))
            {
                age--;
            }
        }

        bool isToday = (day == now.Day && month == now.Month);

        // Next birthday calculation
        var thisYearBirthday = new DateTime(now.Year, month, Math.Min(day, DateTime.DaysInMonth(now.Year, month)));
        DateTime nextBirthday = thisYearBirthday >= now.Date 
            ? thisYearBirthday 
            : new DateTime(now.Year + 1, month, Math.Min(day, DateTime.DaysInMonth(now.Year + 1, month)));

        int daysUntil = (nextBirthday.Date - now.Date).Days;

        return new ParsedDobResult
        {
            IsValid = true,
            Day = day,
            Month = month,
            Year = year > 1900 ? year : null,
            Age = age.HasValue && age.Value >= 0 ? age.Value : null,
            Formatted = $"{day:D2}/{month:D2}/{(year > 1900 ? year.ToString() : "----")}",
            IsToday = isToday,
            DaysUntil = daysUntil
        };
    }
}

