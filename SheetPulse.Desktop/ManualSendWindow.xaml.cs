using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using SheetPulse.Desktop.Models;
using SheetPulse.Desktop.Services;

namespace SheetPulse.Desktop;

public partial class ManualSendWindow : Window
{
    private readonly SettingsService _settingsService;
    private readonly WhatsAppEngine _whatsAppEngine;
    private PhoneSanitizerResult _sanitizedPhone = new();

    public ManualSendWindow(SettingsService settingsService, WhatsAppEngine whatsAppEngine)
    {
        InitializeComponent();
        _settingsService = settingsService;
        _whatsAppEngine = whatsAppEngine;

        LoadBranches();
        LoadGreetingCardImage();
        UpdateMessagePreview();
    }

    private void LoadBranches()
    {
        var settings = _settingsService.GetSettings();
        BranchComboBox.Items.Clear();

        BranchComboBox.Items.Add("Sussex College Network");
        foreach (var b in settings.Branches.Where(b => b.Enabled))
        {
            BranchComboBox.Items.Add(b.Name);
        }

        BranchComboBox.SelectedIndex = 0;
    }

    private void LoadGreetingCardImage()
    {
        var imagePath = _settingsService.GetGreetingCardImagePath();
        if (File.Exists(imagePath))
        {
            try
            {
                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.UriSource = new Uri(imagePath);
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.EndInit();
                CardThumbnailImage.Source = bitmap;
                CardPathText.Text = Path.GetFileName(imagePath);
            }
            catch {}
        }
        else
        {
            CardPathText.Text = "No image found (text-only dispatch)";
        }
    }

    private void OnPhoneChanged(object sender, TextChangedEventArgs e)
    {
        _sanitizedPhone = PhoneSanitizer.Sanitize(PhoneTextBox.Text);
        if (_sanitizedPhone.IsValid)
        {
            PhoneValidationText.Text = $"Valid: {_sanitizedPhone.FormattedDisplay}";
            PhoneValidationText.Foreground = (System.Windows.Media.Brush)FindResource("AccentGreenBrush");
            SendButton.IsEnabled = true;
        }
        else
        {
            PhoneValidationText.Text = "Invalid number. Format: 07XXXXXXXX or +94 7X XXX XXXX";
            PhoneValidationText.Foreground = (System.Windows.Media.Brush)FindResource("AccentRedBrush");
            SendButton.IsEnabled = false;
        }
    }

    private void OnDetailsChanged(object sender, TextChangedEventArgs e)
    {
        UpdateMessagePreview();
    }

    private void OnBranchSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        UpdateMessagePreview();
    }

    private void UpdateMessagePreview()
    {
        var branch = BranchComboBox.SelectedItem?.ToString() ?? "Sussex College Network";
        var name = !string.IsNullOrWhiteSpace(NameTextBox.Text) ? NameTextBox.Text : "Little Sunshine";

        var dummyStudent = new Student
        {
            Name = name,
            Branch = branch
        };

        var settings = _settingsService.GetSettings();
        MessageTextBox.Text = _settingsService.FormatMessage(settings.Template, dummyStudent);
    }

    private async void OnSendClicked(object sender, RoutedEventArgs e)
    {
        if (!_sanitizedPhone.IsValid)
        {
            MessageBox.Show(this, "Please enter a valid phone number before sending.", "Invalid Phone", MessageBoxButton.OK, MessageBoxImage.Warning);
            return;
        }

        SendButton.IsEnabled = false;
        SendButton.Content = "Sending...";

        var student = new Student
        {
            Name = !string.IsNullOrWhiteSpace(NameTextBox.Text) ? NameTextBox.Text : "Little Sunshine",
            Phone = _sanitizedPhone.Sanitized,
            PhoneRaw = PhoneTextBox.Text,
            PhoneDisplay = _sanitizedPhone.FormattedDisplay,
            Branch = BranchComboBox.SelectedItem?.ToString() ?? "Sussex College Network",
            IsPhoneValid = true
        };

        var success = await _whatsAppEngine.SendWishAsync(student, MessageTextBox.Text, forceResend: true);

        if (success)
        {
            MessageBox.Show(this, $"Birthday wish successfully queued for dispatch to {student.Name} ({student.PhoneDisplay})!", "Wish Sent", MessageBoxButton.OK, MessageBoxImage.Information);
            DialogResult = true;
            Close();
        }
        else
        {
            MessageBox.Show(this, "Failed to dispatch message via WhatsApp. Ensure WhatsApp is logged in.", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            SendButton.IsEnabled = true;
            SendButton.Content = "Send Wish";
        }
    }

    private void OnCancelClicked(object sender, RoutedEventArgs e)
    {
        DialogResult = false;
        Close();
    }
}
