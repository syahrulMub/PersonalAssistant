namespace AIPersonalAssistant.Models;

public class AIFeature
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Relasi navigasi
    public ICollection<UserAIFeature> UserAIFeatures { get; set; } = new List<UserAIFeature>();
}
