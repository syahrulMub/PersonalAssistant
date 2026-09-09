namespace AIPersonalAssistant.DTOs;

public class ActivityResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsReviewed { get; set; }
    public DateTime? RemindAt { get; set; }
    public bool IsReminderSent { get; set; }
}
