using System.Text.Json.Serialization;

namespace SheetPulse.Desktop.Models;

public class BirthdayImageConfig
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; } = true;

    [JsonPropertyName("originalPath")]
    public string? OriginalPath { get; set; }

    [JsonPropertyName("relativePath")]
    public string? RelativePath { get; set; } = "data/assets/birthday-card.jpeg";
}

public class AppSettings
{
    [JsonPropertyName("port")]
    public int Port { get; set; } = 3847;

    [JsonPropertyName("timezone")]
    public string Timezone { get; set; } = "Asia/Colombo";

    [JsonPropertyName("autoSendOnBoot")]
    public bool AutoSendOnBoot { get; set; } = true;

    [JsonPropertyName("autoSendDelaySeconds")]
    public int AutoSendDelaySeconds { get; set; } = 10;

    [JsonPropertyName("template")]
    public string Template { get; set; } = 
        "Happy Birthday, Little Sunshine!\n\n" +
        "Wishing our little birthday star a day filled with sweet smiles, happy giggles, lovely surprises and lots of cuddles!\n\n" +
        "May your little world always be filled with love, laughter, magical discoveries and beautiful moments. Keep growing, keep smiling and keep shining bright, little one!\n\n" +
        "With warmest birthday wishes and lots of love,\n" +
        "Sussex College Network";

    [JsonPropertyName("birthdayImage")]
    public BirthdayImageConfig BirthdayImage { get; set; } = new();

    [JsonPropertyName("branches")]
    public List<BranchConfig> Branches { get; set; } = new();
}

