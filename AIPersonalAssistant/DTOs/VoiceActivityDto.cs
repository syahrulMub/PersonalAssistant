using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.DTOs;

public class ParseVoiceRequestDto
{
    [Required(ErrorMessage = "Speech text is required")]
    public string SpeechText { get; set; } = string.Empty;

    public string? ClientTimeZone { get; set; } = "Asia/Jakarta";
}

public class ParseVoiceResponseDto
{
    public bool Success { get; set; }
    public string RawTranscript { get; set; } = string.Empty;
    public List<CreateActivityDto> Activities { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

