using System.Text.Json;
using System.Text.Json.Nodes;

namespace AIPersonalAssistant.DTOs.TracebackMemory;

public class VoiceTurnResponseDto
{
    public string VoiceSpeechResponse { get; set; } = string.Empty;

    public string Intent { get; set; } = "INVALID";
    public string ActionType { get; set; } = "None";
    public string ReportMarkdown { get; set; } = string.Empty;
    public List<VoiceDraftScheduleDto> DraftSchedules { get; set; } = new();
    public List<MemoryMutationDto> MemoryMutations { get; set; } = new();
    public bool IsFinalTurn { get; set; } = false;
}

public class VoiceDraftScheduleDto
{
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string Description { get; set; } = string.Empty;
    public DateTime? SuggestedTime { get; set; }
}

public class MemoryMutationDto
{
    public int? MemoryId { get; set; }
    public string Action { get; set; } = "ADD";
    public string Domain { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
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
    public string ReportMarkdown { get; set; } = string.Empty;
    public List<VoiceDraftScheduleDto> ProposedSchedules { get; set; } = new();
    public List<MemoryMutationDto> MemoryMutations { get; set; } = new();
}
