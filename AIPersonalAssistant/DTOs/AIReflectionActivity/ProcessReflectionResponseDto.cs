namespace AIPersonalAssistant.DTOs.AIReflectionActivity;

public class ProcessReflectionResponseDto
{
    public int ReflectionId { get; set; }
    public string FeedbackText { get; set; } = string.Empty;
    public List<string> AppliedActivityChanges { get; set; } = new();
    public List<string> AppliedMemoryChanges { get; set; } = new();
}