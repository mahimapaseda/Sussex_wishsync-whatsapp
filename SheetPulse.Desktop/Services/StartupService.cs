using System.Diagnostics;
using Microsoft.Win32;

namespace SheetPulse.Desktop.Services;

public static class StartupService
{
    private const string KeyName = "SheetPulse";
    private const string RunKeyPath = @"Software\Microsoft\Windows\CurrentVersion\Run";

    public static bool IsStartupEnabled()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, false);
            return key?.GetValue(KeyName) != null;
        }
        catch
        {
            return false;
        }
    }

    public static bool SetStartup(bool enable)
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(RunKeyPath, true);
            if (key == null) return false;

            if (enable)
            {
                var exePath = Process.GetCurrentProcess().MainModule?.FileName;
                if (!string.IsNullOrEmpty(exePath))
                {
                    key.SetValue(KeyName, $"\"{exePath}\" --minimized");
                    return true;
                }
            }
            else
            {
                if (key.GetValue(KeyName) != null)
                {
                    key.DeleteValue(KeyName, false);
                }
                return true;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Startup] Failed to set startup state: {ex.Message}");
        }

        return false;
    }
}

