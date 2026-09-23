namespace AIPersonalAssistant.DTOs.TracebackMemory;

public class VoiceTurnResponseDto
{
    public string VoiceSpeechResponse { get; set; } = string.Empty;

    public string Intent { get; set; } = "INVALID";
    public string ActionType { get; set; } = "None";
    public List<VoiceDraftScheduleDto> DraftSchedules { get; set; } = new();
    public bool IsFinalTurn { get; set; } = false;
}

public class VoiceDraftScheduleDto
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Description { get; set; } = string.Empty;
    public DateTime? SuggestedTime { get; set; }
}


public class VoiceProcessRequestDto
{
    public int? SessionId { get; set; }
    public string UserSpeechInput { get; set; } = string.Empty;
}


public class VoiceClientResultDto
{
    public int SessionId { get; set; }
    public int CurrentTurn { get; set; }
    public string TextToSpeak { get; set; } = string.Empty;
    public bool IsSessionEnded { get; set; }
    public List<VoiceDraftScheduleDto> ProposedSchedules { get; set; } = new();
}
