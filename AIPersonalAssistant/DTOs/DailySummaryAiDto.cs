namespace AIPersonalAssistant.DTOs;

public class DailySummaryAiDto
{
    public string SummaryText { get; set; } = string.Empty;
    public string PositiveAffirmations { get; set; } = string.Empty;
    public string ActionableInsights { get; set; } = string.Empty;
}

public class MorningBriefingDto
{
    public string TodayFocus { get; set; } = string.Empty;
    public string YesterdayContext { get; set; } = string.Empty;
    public string ActivityStrategy { get; set; } = string.Empty;
    public List<AgendaGroupDto> AgendaGroups { get; set; } = new();
    public string ClosingMotivation { get; set; } = string.Empty;
}

public class AgendaGroupDto
{
    public string Category { get; set; } = string.Empty;
    public List<AgendaItemDto> Items { get; set; } = new();
}

public class AgendaItemDto
{
    public string Task { get; set; } = string.Empty;
    public string ContextNote { get; set; } = string.Empty;
}