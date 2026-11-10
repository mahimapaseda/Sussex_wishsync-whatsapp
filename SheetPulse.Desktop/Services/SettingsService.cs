using System.IO;
using System.Text.Json;
using SheetPulse.Desktop.Models;

namespace SheetPulse.Desktop.Services;

public class SettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };
    private readonly string _settingsFilePath;
    private AppSettings _currentSettings;

    public SettingsService()
    {
        _settingsFilePath = ResolveSettingsPath();
        _currentSettings = LoadInternal();
    }

    public AppSettings GetSettings() => _currentSettings;

    public void SaveSettings(AppSettings settings)
    {
        _currentSettings = settings;
        try
        {
            var dir = Path.GetDirectoryName(_settingsFilePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(settings, JsonOptions);
            File.WriteAllText(_settingsFilePath, json);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Settings] Failed to save settings: {ex.Message}");
        }
    }

    public string FormatMessage(string template, Student student)
    {
        if (string.IsNullOrWhiteSpace(template))
        {
            template = _currentSettings.Template;
        }

        var name = !string.IsNullOrWhiteSpace(student.Name) ? student.Name : "Little Sunshine";
        var firstName = !string.IsNullOrWhiteSpace(student.FirstName) 
            ? student.FirstName 
            : name.Split(' ')[0];

        var result = template
            .Replace("{name}", name)
            .Replace("{first_name}", firstName)
            .Replace("{branch}", student.Branch)
            .Replace("{age}", student.Age?.ToString() ?? "")
            .Replace("{turning_age}", student.Age?.ToString() ?? "")
            .Replace("{dob}", student.DobFormatted ?? "");

        return result;
    }

    public string GetGreetingCardImagePath()
    {
        var imgConfig = _currentSettings.BirthdayImage;
        if (imgConfig != null && !imgConfig.Enabled)
        {
            return string.Empty;
        }

        var baseDirs = new[]
        {
            AppDomain.CurrentDomain.BaseDirectory,
            Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..")),
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData)
        };

        foreach (var dir in baseDirs)
        {
            if (!string.IsNullOrEmpty(imgConfig?.RelativePath))
            {
                var candidate = Path.Combine(dir, imgConfig.RelativePath);
                if (File.Exists(candidate)) return candidate;
            }

            var directCard = Path.Combine(dir, "data", "assets", "birthday-card.jpeg");
            if (File.Exists(directCard)) return directCard;
        }

        if (!string.IsNullOrEmpty(imgConfig?.OriginalPath) && File.Exists(imgConfig.OriginalPath))
        {
            return imgConfig.OriginalPath;
        }

        return string.Empty;
    }

    private AppSettings LoadInternal()
    {
        try
        {
            if (File.Exists(_settingsFilePath))
            {
                var json = File.ReadAllText(_settingsFilePath);
                var loaded = JsonSerializer.Deserialize<AppSettings>(json);
                if (loaded != null)
                {
                    return loaded;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Settings] Error loading settings: {ex.Message}");
        }

        var fallback = new AppSettings();
        SaveSettings(fallback);
        return fallback;
    }

    private static string ResolveSettingsPath()
    {
        var baseDirs = new[]
        {
            Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..")),
            AppDomain.CurrentDomain.BaseDirectory,
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse")
        };

        foreach (var dir in baseDirs)
        {
            var target = Path.Combine(dir, "data", "settings.json");
            if (File.Exists(target)) return target;
        }

        return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse", "data", "settings.json");
    }
}

