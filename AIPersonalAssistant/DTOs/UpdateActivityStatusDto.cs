namespace AIPersonalAssistant.DTOs;

public class UpdateActivityStatusDto
{
    public string Status { get; set; } = "Completed";
    public string? ResolutionSource { get; set; }
    public string? Note { get; set; }
}

