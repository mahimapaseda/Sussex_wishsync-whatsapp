using System.IO;
using System.Text.Json;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;
using SheetPulse.Desktop.Models;

namespace SheetPulse.Desktop.Services;

public class WhatsAppStatus
{
    public string Status { get; set; } = "INITIALIZING"; // INITIALIZING, QR_READY, READY, ERROR
    public bool IsReady => Status == "READY";
    public string? QrDataUrl { get; set; }
    public string? PushName { get; set; }
    public string? Phone { get; set; }
}

public class WhatsAppEngine
{
    private readonly WebView2 _webView;
    private readonly SettingsService _settingsService;
    private readonly LedgerService _ledgerService;
    private bool _isInitialized;
    private WhatsAppStatus _currentStatus = new();

    public event Action<WhatsAppStatus>? StatusChanged;

    public WhatsAppEngine(WebView2 webView, SettingsService settingsService, LedgerService ledgerService)
    {
        _webView = webView;
        _settingsService = settingsService;
        _ledgerService = ledgerService;
    }

    public WhatsAppStatus GetStatus() => _currentStatus;

    public async Task InitializeAsync()
    {
        if (_isInitialized) return;

        try
        {
            var userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SheetPulse", "WebView2Data");
            if (!Directory.Exists(userDataFolder))
            {
                Directory.CreateDirectory(userDataFolder);
            }

            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await _webView.EnsureCoreWebView2Async(env);

            _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _webView.CoreWebView2.Settings.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 SheetPulse/1.0";

            _webView.CoreWebView2.NavigationCompleted += OnNavigationCompleted;
            _webView.Source = new Uri("https://web.whatsapp.com");
            _isInitialized = true;

            StartStatusPoller();
        }
        catch (Exception ex)
        {
            _currentStatus = new WhatsAppStatus { Status = "ERROR" };
            StatusChanged?.Invoke(_currentStatus);
            Console.WriteLine($"[WhatsAppEngine] Initialization failed: {ex.Message}");
        }
    }

    private void OnNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
    {
        PollStatusOnce();
    }

    private void StartStatusPoller()
    {
        var timer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(3)
        };
        timer.Tick += (s, e) => PollStatusOnce();
        timer.Start();
    }

    private async void PollStatusOnce()
    {
        if (_webView.CoreWebView2 == null) return;

        try
        {
            // Script to detect QR code or logged-in state
            var script = @"
                (function() {
                    var side = document.querySelector('#pane-side') || document.querySelector('[data-testid=""chat-list""]');
                    if (side) {
                        return { status: 'READY' };
                    }
                    var canvas = document.querySelector('canvas[aria-label=""Scan me!""]') || document.querySelector('canvas');
                    if (canvas) {
                        try {
                            return { status: 'QR_READY', qr: canvas.toDataURL() };
                        } catch(e) {}
                    }
                    return { status: 'INITIALIZING' };
                })();
            ";

            var jsonResult = await _webView.CoreWebView2.ExecuteScriptAsync(script);
            if (!string.IsNullOrEmpty(jsonResult) && jsonResult != "null")
            {
                using var doc = JsonDocument.Parse(jsonResult);
                var root = doc.RootElement;
                if (root.TryGetProperty("status", out var st))
                {
                    var statusStr = st.GetString() ?? "INITIALIZING";
                    string? qr = root.TryGetProperty("qr", out var qrProp) ? qrProp.GetString() : null;

                    if (_currentStatus.Status != statusStr || _currentStatus.QrDataUrl != qr)
                    {
                        _currentStatus = new WhatsAppStatus
                        {
                            Status = statusStr,
                            QrDataUrl = qr
                        };
                        StatusChanged?.Invoke(_currentStatus);
                    }
                }
            }
        }
        catch {}
    }

    public async Task<bool> SendWishAsync(Student student, string template, bool forceResend = false)
    {
        var today = DobParser.GetNowInTimezone();
        var phone = student.Phone;

        if (!forceResend && _ledgerService.HasBeenSentThisYear(phone, today.Year))
        {
            return true;
        }

        var message = _settingsService.FormatMessage(template, student);
        var cardPath = _settingsService.GetGreetingCardImagePath();

        try
        {
            var encodedText = Uri.EscapeDataString(message);
            var sendUrl = $"https://web.whatsapp.com/send?phone={phone}&text={encodedText}";

            _webView.CoreWebView2.Navigate(sendUrl);

            // Wait for composer to load and trigger send
            await Task.Delay(4500);

            var sendScript = @"
                (async function() {
                    for (let i = 0; i < 20; i++) {
                        let btn = document.querySelector('span[data-icon=""send""]') || document.querySelector('button[aria-label=""Send""]');
                        if (btn) {
                            btn.click();
                            return true;
                        }
                        await new Promise(r => setTimeout(r, 500));
                    }
                    return false;
                })();
            ";

            await _webView.CoreWebView2.ExecuteScriptAsync(sendScript);

            _ledgerService.RecordSent(phone, student.Name, today.Year, message, "SheetPulse .NET Desktop");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[WhatsAppEngine] Send error: {ex.Message}");
            return false;
        }
    }
}

