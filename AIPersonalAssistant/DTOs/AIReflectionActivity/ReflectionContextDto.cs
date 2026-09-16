namespace AIPersonalAssistant.DTOs.AIReflectionActivity;

public class ReflectionContextDto
{
    public string ContextType { get; set; } = "Daily"; // "Daily" atau "Weekly"
    public string PeriodLabel { get; set; } = string.Empty;
    public string BriefDigest { get; set; } = string.Empty;
    public List<ReflectionFocusItemDto> ItemsToClarify { get; set; } = new();
    public List<string> WinsAndCompletions { get; set; } = new();
    public string PersonalizedQuestion { get; set; } = string.Empty;

    // Field input dari user (diisi oleh FE sebelum POST)
    public string? Transcript { get; set; }
}

public class ReflectionFocusItemDto
{
    public int? ActivityId { get; set; }
    public string? KeyTopic { get; set; }
    public string? ContextNote { get; set; }
    public string? Type { get; set; }
}

public class ProcessReflectionRequestDto
{
    public string ContextType { get; set; } = "Daily"; // "Daily" | "Weekly"
    public string Transcript { get; set; } = string.Empty;
    public string? AudioUrl { get; set; }
    public ReflectionContextDto PresentedContext { get; set; } = new();
}
