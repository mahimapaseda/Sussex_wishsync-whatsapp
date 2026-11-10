using System.Text.RegularExpressions;

namespace SheetPulse.Desktop.Services;

public class PhoneSanitizerResult
{
    public bool IsValid { get; set; }
    public string Sanitized { get; set; } = string.Empty;
    public string FormattedDisplay { get; set; } = string.Empty;
    public string Raw { get; set; } = string.Empty;
}

public static class PhoneSanitizer
{
    private static readonly Regex SriLankanRegex = new(@"^94(7[0-9]{8})$", RegexOptions.Compiled);

    public static PhoneSanitizerResult Sanitize(string? rawInput)
    {
        var raw = rawInput ?? string.Empty;
        var digitsOnly = Regex.Replace(raw, @"\D", "");

        if (string.IsNullOrWhiteSpace(digitsOnly))
        {
            return new PhoneSanitizerResult { IsValid = false, Raw = raw };
        }

        string normalized = digitsOnly;

        // 07XXXXXXXX (10 digits starting with 0) -> 947XXXXXXXX
        if (digitsOnly.Length == 10 && digitsOnly.StartsWith('0'))
        {
            normalized = "94" + digitsOnly[1..];
        }
        // 7XXXXXXXX (9 digits starting with 7) -> 947XXXXXXXX
        else if (digitsOnly.Length == 9 && digitsOnly.StartsWith('7'))
        {
            normalized = "94" + digitsOnly;
        }
        // 0094...
        else if (digitsOnly.StartsWith("0094"))
        {
            normalized = digitsOnly[2..];
        }

        var match = SriLankanRegex.Match(normalized);
        if (match.Success)
        {
            var nationalPart = match.Groups[1].Value; // 7XXXXXXXX
            var formatted = $"+94 {nationalPart[..2]} {nationalPart.Substring(2, 3)} {nationalPart.Substring(5, 4)}";

            return new PhoneSanitizerResult
            {
                IsValid = true,
                Sanitized = normalized,
                FormattedDisplay = formatted,
                Raw = raw
            };
        }

        // Generic international fallback (minimum 10 digits)
        if (digitsOnly.Length >= 10 && digitsOnly.Length <= 15)
        {
            return new PhoneSanitizerResult
            {
                IsValid = true,
                Sanitized = digitsOnly,
                FormattedDisplay = "+" + digitsOnly,
                Raw = raw
            };
        }

        return new PhoneSanitizerResult
        {
            IsValid = false,
            Sanitized = digitsOnly,
            FormattedDisplay = raw,
            Raw = raw
        };
    }
}

