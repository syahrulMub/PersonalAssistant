namespace AIPersonalAssistant.DTOs.AIReflectionActivity;

public class UnresolvedActivityDto
{
    public int ActivityId { get; set; }
    public string Title { get; set; }
    public string Category { get; set; }
    public DateTime? ScheduledTime { get; set; }
    public int RescheduleCount { get; set; }
    public string CurrentStatus { get; set; }
}
