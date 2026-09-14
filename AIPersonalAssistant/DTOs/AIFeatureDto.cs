namespace AIPersonalAssistant.DTOs;

public class UserAIFeatureResponseDto
{
    public int FeatureId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsEnabled { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class ToggleAIFeatureRequestDto
{
    public int FeatureId { get; set; }
    public bool IsEnabled { get; set; }
}

