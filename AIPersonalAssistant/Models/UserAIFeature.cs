namespace AIPersonalAssistant.Models;

public class UserAIFeature
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int FeatureId { get; set; }
    public AIFeature AIFeature { get; set; } = null!;

    // Status on/off per user
    public bool IsEnabled { get; set; } = false;
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
