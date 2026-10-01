namespace AIPersonalAssistant.DTOs;


public class DashboardSummaryDto
{
    public DateTime? GeneratedAt { get; set; }
    public List<FocusPercentageDto> FocusDistributions { get; set; } = new();
    public List<string> DiscoveredPattern { get; set; } = new();
    public List<string> HabitTweakRecommendation { get; set; } = new();
    public List<string> ActiveDomains { get; set; } = new();
    public List<ExplorationSparkDto> ExplorationKeywords { get; set; } = new();
}

public class FocusPercentageDto
{
    public string Category { get; set; } = string.Empty;
    public int Percentage { get; set; }
}

public class ExplorationSparkDto
{
    public string Keyword { get; set; } = string.Empty;
    public string Context { get; set; } = string.Empty;
}