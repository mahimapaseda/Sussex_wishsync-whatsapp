using System.ComponentModel;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using SheetPulse.Desktop.Models;
using SheetPulse.Desktop.Services;

namespace SheetPulse.Desktop;

public partial class MainWindow : Window
{
    private readonly SettingsService _settingsService;
    private readonly LedgerService _ledgerService;
    private readonly GoogleSheetsService _sheetsService;
    private readonly WhatsAppEngine _whatsAppEngine;
    private readonly System.Windows.Forms.NotifyIcon _trayIcon;

    private SheetsFetchResult _sheetData = new();
    private string _selectedBranchFilter = "ALL";
    private DispatcherTimer? _countdownTimer;
    private int _remainingCountdownSeconds;
    private bool _isClosingForReal;

    public MainWindow()
    {
        InitializeComponent();

        _settingsService = new SettingsService();
        _ledgerService = new LedgerService();
        _sheetsService = new GoogleSheetsService(_settingsService, _ledgerService);
        _whatsAppEngine = new WhatsAppEngine(HiddenWebView, _settingsService, _ledgerService);

        // System Tray NotifyIcon
        _trayIcon = new System.Windows.Forms.NotifyIcon
        {
            Icon = System.Drawing.SystemIcons.Application,
            Text = "SheetPulse — Sussex College Network",
            Visible = true
        };
        InitializeTrayMenu();

        // Hook Window Events
        Closing += OnWindowClosing;
        StateChanged += OnWindowStateChanged;
        Loaded += OnWindowLoaded;

        // Wire WhatsApp Status
        _whatsAppEngine.StatusChanged += OnWhatsAppStatusUpdated;

        // Start Clock Timer
        StartClockTimer();
    }

    private void InitializeTrayMenu()
    {
        var contextMenu = new System.Windows.Forms.ContextMenuStrip();
        contextMenu.Items.Add("Open Dashboard", null, (s, e) => ShowAndRestore());
        contextMenu.Items.Add("Sync Sheets", null, async (s, e) => await RefreshDataAsync(true));
        contextMenu.Items.Add("Manual Send", null, (s, e) => Dispatcher.Invoke(OnManualSendClicked, this, new RoutedEventArgs()));
        contextMenu.Items.Add(new System.Windows.Forms.ToolStripSeparator());
        contextMenu.Items.Add("Exit SheetPulse", null, (s, e) =>
        {
            _isClosingForReal = true;
            _trayIcon.Visible = false;
            _trayIcon.Dispose();
            Application.Current.Shutdown();
        });

        _trayIcon.ContextMenuStrip = contextMenu;
        _trayIcon.DoubleClick += (s, e) => ShowAndRestore();
    }

    private async void OnWindowLoaded(object sender, RoutedEventArgs e)
    {
        // Check startup argument --minimized
        var args = Environment.GetCommandLineArgs();
        if (args.Contains("--minimized"))
        {
            Hide();
        }

        // Initialize WhatsApp Engine
        await _whatsAppEngine.InitializeAsync();

        // Initial Data Fetch
        await RefreshDataAsync();

        // Boot countdown
        var settings = _settingsService.GetSettings();
        if (settings.AutoSendOnBoot && _sheetData.Today.Any(s => s.Status == "PENDING_TODAY"))
        {
            StartBootCountdown(settings.AutoSendDelaySeconds);
        }
    }

    private void StartClockTimer()
    {
        var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        timer.Tick += (s, e) =>
        {
            var now = DobParser.GetNowInTimezone();
            DateTimeText.Text = $"{now:dd/MM/yyyy} ({now:HH:mm:ss}) • Asia/Colombo";
        };
        timer.Start();
    }

    private async Task RefreshDataAsync(bool forceRefresh = false)
    {
        SheetsStatusText.Text = "Syncing...";
        _sheetData = await _sheetsService.FetchAllStudentsAsync(forceRefresh);

        if (_sheetData.Success)
        {
            SheetsStatusText.Text = $"Connected ({_sheetData.Count} rows)";
            SheetsStatusText.Foreground = (System.Windows.Media.Brush)FindResource("AccentGreenBrush");
            SheetsDot.Fill = (System.Windows.Media.Brush)FindResource("AccentGreenBrush");
        }
        else
        {
            SheetsStatusText.Text = "Disconnected / Error";
            SheetsStatusText.Foreground = (System.Windows.Media.Brush)FindResource("AccentRedBrush");
            SheetsDot.Fill = (System.Windows.Media.Brush)FindResource("AccentRedBrush");
        }

        UpdateBranchPills();
        FilterAndRenderStudents();
        RenderLedger();
    }

    private void UpdateBranchPills()
    {
        BranchFilterPanel.Children.Clear();

        var totalToday = _sheetData.Today.Count;
        var allBtn = CreatePillButton($"All Branches ({totalToday})", "ALL", _selectedBranchFilter == "ALL");
        BranchFilterPanel.Children.Add(allBtn);

        var settings = _settingsService.GetSettings();
        foreach (var branch in settings.Branches.Where(b => b.Enabled))
        {
            var branchCount = _sheetData.Today.Count(s => s.Branch == branch.Name || s.BranchId == branch.Id);
            var isSelected = _selectedBranchFilter == branch.Id || _selectedBranchFilter == branch.Name;
            var pill = CreatePillButton($"{branch.Name} ({branchCount})", branch.Id, isSelected);
            BranchFilterPanel.Children.Add(pill);
        }
    }

    private Button CreatePillButton(string text, string tag, bool isSelected)
    {
        var btn = new Button
        {
            Content = text,
            Tag = tag,
            Margin = new Thickness(0, 0, 8, 4),
            FontSize = 11,
            Background = isSelected 
                ? (System.Windows.Media.Brush)FindResource("AccentBlueBrush") 
                : (System.Windows.Media.Brush)FindResource("CardSubtleBrush"),
            Foreground = System.Windows.Media.Brushes.White
        };

        btn.Click += (s, e) =>
        {
            _selectedBranchFilter = tag;
            UpdateBranchPills();
            FilterAndRenderStudents();
        };

        return btn;
    }

    private void FilterAndRenderStudents()
    {
        var filtered = _sheetData.Today;
        if (_selectedBranchFilter != "ALL")
        {
            filtered = _sheetData.Today
                .Where(s => s.BranchId == _selectedBranchFilter || s.Branch == _selectedBranchFilter)
                .ToList();
        }

        TodayStudentsItemsControl.ItemsSource = filtered;
        TodayEmptyState.Visibility = filtered.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        TodayListBadge.Text = filtered.Count.ToString();

        // Stat Badges
        StatTodayCount.Text = _sheetData.Today.Count.ToString();
        StatPendingCount.Text = _sheetData.Today.Count(s => s.Status == "PENDING_TODAY").ToString();
        StatDeliveredCount.Text = _sheetData.Today.Count(s => s.Status == "SENT_TODAY").ToString();
        StatUpcomingCount.Text = _sheetData.Upcoming.Count.ToString();

        // Upcoming
        UpcomingItemsControl.ItemsSource = _sheetData.Upcoming;
    }

    private void RenderLedger()
    {
        var records = _ledgerService.GetAllRecords().Take(20).ToList();
        LedgerItemsControl.ItemsSource = records;
    }

    private void OnWhatsAppStatusUpdated(WhatsAppStatus status)
    {
        Dispatcher.Invoke(() =>
        {
            if (status.Status == "READY")
            {
                WhatsAppStatusText.Text = "Ready";
                WhatsAppStatusText.Foreground = (System.Windows.Media.Brush)FindResource("AccentGreenBrush");
                WhatsAppDot.Fill = (System.Windows.Media.Brush)FindResource("AccentGreenBrush");
            }
            else if (status.Status == "QR_READY")
            {
                WhatsAppStatusText.Text = "Scan QR Needed";
                WhatsAppStatusText.Foreground = (System.Windows.Media.Brush)FindResource("AccentGoldBrush");
                WhatsAppDot.Fill = (System.Windows.Media.Brush)FindResource("AccentGoldBrush");
            }
            else
            {
                WhatsAppStatusText.Text = status.Status;
                WhatsAppStatusText.Foreground = (System.Windows.Media.Brush)FindResource("TextSecondaryBrush");
                WhatsAppDot.Fill = (System.Windows.Media.Brush)FindResource("TextSecondaryBrush");
            }
        });
    }

    private async void OnSendStudentWishClicked(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is Student student)
        {
            btn.IsEnabled = false;
            btn.Content = "...";

            var settings = _settingsService.GetSettings();
            var template = !string.IsNullOrEmpty(student.BranchCustomTemplate) 
                ? student.BranchCustomTemplate 
                : settings.Template;

            var success = await _whatsAppEngine.SendWishAsync(student, template, forceResend: true);
            if (success)
            {
                student.Status = "SENT_TODAY";
                FilterAndRenderStudents();
                RenderLedger();
                MessageBox.Show(this, $"Birthday wish dispatched to {student.Name} ({student.PhoneDisplay})!", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            else
            {
                MessageBox.Show(this, "Dispatch failed. Please check WhatsApp status.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                btn.IsEnabled = true;
                btn.Content = "Send Wish";
            }
        }
    }

    private void StartBootCountdown(int seconds)
    {
        _remainingCountdownSeconds = seconds;
        CountdownBanner.Visibility = Visibility.Visible;
        CountdownMessageText.Text = $"Sending today's birthday wishes in {_remainingCountdownSeconds}s...";

        _countdownTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _countdownTimer.Tick += async (s, e) =>
        {
            _remainingCountdownSeconds--;
            if (_remainingCountdownSeconds > 0)
            {
                CountdownMessageText.Text = $"Sending today's birthday wishes in {_remainingCountdownSeconds}s...";
            }
            else
            {
                _countdownTimer.Stop();
                CountdownBanner.Visibility = Visibility.Collapsed;
                await DispatchAllPendingToday();
            }
        };
        _countdownTimer.Start();
    }

    private void OnCancelCountdownClicked(object sender, RoutedEventArgs e)
    {
        _countdownTimer?.Stop();
        CountdownBanner.Visibility = Visibility.Collapsed;
    }

    private async void OnSendNowCountdownClicked(object sender, RoutedEventArgs e)
    {
        _countdownTimer?.Stop();
        CountdownBanner.Visibility = Visibility.Collapsed;
        await DispatchAllPendingToday();
    }

    private async Task DispatchAllPendingToday()
    {
        var pending = _sheetData.Today.Where(s => s.Status == "PENDING_TODAY").ToList();
        if (pending.Count == 0) return;

        var settings = _settingsService.GetSettings();

        foreach (var s in pending)
        {
            var template = !string.IsNullOrEmpty(s.BranchCustomTemplate) ? s.BranchCustomTemplate : settings.Template;
            await _whatsAppEngine.SendWishAsync(s, template, forceResend: false);
            s.Status = "SENT_TODAY";
            // Pacing
            await Task.Delay(4000);
        }

        FilterAndRenderStudents();
        RenderLedger();

        _trayIcon.ShowBalloonTip(4000, "SheetPulse Birthday Dispatch", $"Successfully sent {pending.Count} birthday wishes for Sussex College Network!", System.Windows.Forms.ToolTipIcon.Info);
    }

    private void OnManualSendClicked(object sender, RoutedEventArgs e)
    {
        var dialog = new ManualSendWindow(_settingsService, _whatsAppEngine) { Owner = this };
        if (dialog.ShowDialog() == true)
        {
            RenderLedger();
        }
    }

    private void OnSettingsClicked(object sender, RoutedEventArgs e)
    {
        var dialog = new SettingsWindow(_settingsService) { Owner = this };
        if (dialog.ShowDialog() == true)
        {
            _ = RefreshDataAsync(true);
        }
    }

    private async void OnSyncClicked(object sender, RoutedEventArgs e)
    {
        await RefreshDataAsync(true);
    }

    private void OnWhatsAppStatusClicked(object sender, RoutedEventArgs e)
    {
        var status = _whatsAppEngine.GetStatus();
        if (status.Status == "READY")
        {
            MessageBox.Show(this, "WhatsApp is connected and ready to send messages!", "WhatsApp Status", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        else if (status.Status == "QR_READY")
        {
            MessageBox.Show(this, "Please open WhatsApp on your phone > Settings > Linked Devices > Link a Device to complete pairing.", "Scan QR Needed", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
        else
        {
            MessageBox.Show(this, $"WhatsApp status: {status.Status}. Waiting for session initialization...", "WhatsApp Status", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }

    private void OnExportLedgerClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            var csv = _ledgerService.ExportCsv();
            var path = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), $"SheetPulse_Delivery_Log_{DateTime.Now:yyyyMMdd}.csv");
            File.WriteAllText(path, csv);
            MessageBox.Show(this, $"Sent ledger exported to your Desktop:\n{path}", "Export Successful", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"Export failed: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void ShowAndRestore()
    {
        Show();
        WindowState = WindowState.Normal;
        Activate();
    }

    private void OnWindowStateChanged(object? sender, EventArgs e)
    {
        if (WindowState == WindowState.Minimized)
        {
            Hide();
            _trayIcon.ShowBalloonTip(2000, "SheetPulse Minimized", "SheetPulse is running in the background.", System.Windows.Forms.ToolTipIcon.Info);
        }
    }

    private void OnWindowClosing(object? sender, CancelEventArgs e)
    {
        if (!_isClosingForReal)
        {
            e.Cancel = true;
            Hide();
            _trayIcon.ShowBalloonTip(2000, "SheetPulse Background Engine", "SheetPulse minimized to system tray. Right-click icon to Exit.", System.Windows.Forms.ToolTipIcon.Info);
        }
    }
}
