namespace AIPersonalAssistant.DTOs.AIMemoryBackserviceDto;

public class MemoryDecisionDto
{
    public string Action { get; set; } = string.Empty; // CREATE, UPDATE, IGNORE, MERGE
    public int? ExistingMemoryId { get; set; }
    public int? SourceMemoryId { get; set; }
    public string MemoryType { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string ValueJson { get; set; } = "{}";
    public double Confidence { get; set; }
    public string? Reason { get; set; }
    public List<MemoryEvidenceDto> Evidence { get; set; } = new();
}
