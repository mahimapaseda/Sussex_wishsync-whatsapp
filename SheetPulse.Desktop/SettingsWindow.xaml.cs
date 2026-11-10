using System.Windows;
using System.Windows.Controls;
using SheetPulse.Desktop.Models;
using SheetPulse.Desktop.Services;

namespace SheetPulse.Desktop;

public partial class SettingsWindow : Window
{
    private readonly SettingsService _settingsService;
    private AppSettings _settings;

    public SettingsWindow(SettingsService settingsService)
    {
        InitializeComponent();
        _settingsService = settingsService;
        _settings = _settingsService.GetSettings();

        LoadSettingsToUI();
    }

    private void LoadSettingsToUI()
    {
        TemplateTextBox.Text = _settings.Template;
        AttachImageCheckBox.IsChecked = _settings.BirthdayImage.Enabled;
        AutoSendBootCheckBox.IsChecked = _settings.AutoSendOnBoot;
        DelayTextBox.Text = _settings.AutoSendDelaySeconds.ToString();
        StartupCheckBox.IsChecked = StartupService.IsStartupEnabled();

        BranchesItemsControl.ItemsSource = _settings.Branches;
    }

    private void OnInsertTokenClicked(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is string token)
        {
            var caretIndex = TemplateTextBox.CaretIndex;
            TemplateTextBox.Text = TemplateTextBox.Text.Insert(caretIndex, token);
            TemplateTextBox.CaretIndex = caretIndex + token.Length;
            TemplateTextBox.Focus();
        }
    }

    private void OnSaveClicked(object sender, RoutedEventArgs e)
    {
        _settings.Template = TemplateTextBox.Text.Trim();
        _settings.BirthdayImage.Enabled = AttachImageCheckBox.IsChecked ?? true;
        _settings.AutoSendOnBoot = AutoSendBootCheckBox.IsChecked ?? true;

        if (int.TryParse(DelayTextBox.Text, out int delay))
        {
            _settings.AutoSendDelaySeconds = Math.Clamp(delay, 3, 120);
        }

        _settingsService.SaveSettings(_settings);

        // Windows Startup registry
        StartupService.SetStartup(StartupCheckBox.IsChecked ?? false);

        MessageBox.Show(this, "Settings saved successfully!", "Saved", MessageBoxButton.OK, MessageBoxImage.Information);
        DialogResult = true;
        Close();
    }

    private void OnCancelClicked(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }
}

