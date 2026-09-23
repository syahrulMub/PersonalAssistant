namespace AIPersonalAssistant.DTOs.TracebackMemory;

public class VoiceTurnItemDto
{
    public int TurnIndex { get; set; }
    public string Speaker { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}