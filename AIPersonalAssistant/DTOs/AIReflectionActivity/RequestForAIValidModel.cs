namespace AIPersonalAssistant.DTOs.AIReflectionActivity;

public class AIReflectionOutputDto
{
    public string FeedbackText { get; set; }
    public List<AIActivityAdjustmentPayload> ActivityAdjustments { get; set; } = new();
    public List<AIMemoryUpdatePayload> MemoryUpdates { get; set; } = new();
}
public class AIMemoryUpdatePayload
{
    public int? MemoryId { get; set; }
    public int? RelatedActivityId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string MemoryType { get; set; } = "State";
    public object? Value { get; set; }
    public double Confidence { get; set; } = 1.0;
}

public class AIActivityAdjustmentPayload
{
    public string ActionType { get; set; } // "MarkCompleted", "Reschedule", "CreateNew", "Cancel"
    public int? TargetActivityId { get; set; }
    public string? TargetActivityTitle { get; set; }
    public DateTime? ActualCompletedDate { get; set; }
    public DateTime? NewScheduledTime { get; set; }
    public string? NewTaskTitle { get; set; }
    public string? NewTaskCategory { get; set; }
    public string? NewStatus { get; set; }
    public string? Note { get; set; }
}