namespace AIPersonalAssistant.DTOs;

public class DailySummaryAiDto
{
    public string SummaryText { get; set; } = string.Empty;
    public string PositiveAffirmations { get; set; } = string.Empty;
    public string ActionableInsights { get; set; } = string.Empty;
}