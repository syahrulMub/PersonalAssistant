namespace AIPersonalAssistant.DTOs.AIMemoryBackserviceDto;

public class MemoryEvidenceDto
{
    public int? SourceId { get; set; }
    public string SourceType { get; set; } = "Activity";
    public string ObservationValue { get; set; } = string.Empty;
}
