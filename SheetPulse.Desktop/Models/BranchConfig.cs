namespace SheetPulse.Desktop.Models;

public class BranchConfig
{
    public string Id { get; set; } = "branch_" + Guid.NewGuid().ToString("N")[..8];
    public string Name { get; set; } = string.Empty;
    public string SheetUrl { get; set; } = string.Empty;
    public string SheetName { get; set; } = "INQUIRY DETAILS 2026/27";
    public bool Enabled { get; set; } = true;
    public string? CustomTemplate { get; set; }
}

