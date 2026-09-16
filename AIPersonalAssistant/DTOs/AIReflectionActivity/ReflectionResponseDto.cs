namespace AIPersonalAssistant.DTOs.AIReflectionActivity;

public class ReflectionResponseDto
{
    public int ReflectionId { get; set; }
    public string AIFeedback { get; set; }
    public int ActivitiesUpdatedCount { get; set; }
    public int MemoriesUpdatedCount { get; set; }
    public List<string> AppliedChanges { get; set; } = new();
}
