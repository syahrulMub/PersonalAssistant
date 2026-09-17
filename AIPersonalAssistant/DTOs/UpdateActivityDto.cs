namespace AIPersonalAssistant.DTOs;

public class UpdateActivityDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public bool? IsReminder { get; set; }
    public DateTime? RemindAt { get; set; }
    public string? Status { get; set; }
    public bool? IsReschedule { get; set; }
    public string? ResolutionSource { get; set; }
    public string? Note { get; set; }
}

