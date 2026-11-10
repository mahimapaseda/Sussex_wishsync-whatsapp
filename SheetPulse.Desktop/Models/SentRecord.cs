using System.Text.Json.Serialization;

namespace SheetPulse.Desktop.Models;

public class SentRecord
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("year")]
    public int Year { get; set; }

    [JsonPropertyName("dateSent")]
    public string DateSent { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "SENT";

    [JsonPropertyName("method")]
    public string Method { get; set; } = "SheetPulse .NET";

    [JsonPropertyName("messagePreview")]
    public string MessagePreview { get; set; } = string.Empty;
}

public class LedgerContainer
{
    [JsonPropertyName("records")]
    public Dictionary<string, SentRecord> Records { get; set; } = new();

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = string.Empty;
}

