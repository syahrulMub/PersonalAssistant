namespace AIPersonalAssistant.DTOs;

public class ActivityResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string Status { get; set; } = "Pending";
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RemindAt { get; set; }
    public DateTime? OriginalRemindAt { get; set; }
    public bool IsReminder { get; set; }
    public int RescheduleCount { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? ResolutionSource { get; set; }
    public string? Note { get; set; }
}
