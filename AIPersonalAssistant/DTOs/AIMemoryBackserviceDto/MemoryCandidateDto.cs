namespace AIPersonalAssistant.DTOs.AIMemoryBackserviceDto;

public class MemoryCandidateDto
{
    public string MemoryType { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public object? Value { get; set; }

    public string Source { get; set; } = "InferredFromActivity";

    public double Confidence { get; set; }

    public List<MemoryEvidenceDto> Evidence { get; set; } = new();
}
