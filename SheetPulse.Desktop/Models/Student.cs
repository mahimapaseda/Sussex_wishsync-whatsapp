namespace SheetPulse.Desktop.Models;

public class Student
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = "Little Sunshine";
    public string? FirstName { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string PhoneRaw { get; set; } = string.Empty;
    public string PhoneDisplay { get; set; } = string.Empty;
    public bool IsPhoneValid { get; set; }
    public string? DobRaw { get; set; }
    public string? DobFormatted { get; set; }
    public int? BirthYear { get; set; }
    public int? Age { get; set; }
    public string Branch { get; set; } = "Sussex College Network";
    public string BranchId { get; set; } = string.Empty;
    public string? BranchCustomTemplate { get; set; }
    public string Status { get; set; } = "PENDING_TODAY"; // PENDING_TODAY, SENT_TODAY, UPCOMING
    public int DaysUntil { get; set; }
}

