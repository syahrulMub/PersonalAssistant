namespace AIPersonalAssistant.DTOs.TracebackMemory;

public class VoiceAndResponseDto
{
    public int TurnIndex { get; set; }
    public string Speaker { get; set; } = string.Empty; // "User" atau "Assistant"
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.Now;
}
