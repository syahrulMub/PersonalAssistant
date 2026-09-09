namespace AIPersonalAssistant.Models;

public class AIRecap
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public string SummaryText { get; set; }
    public string PositiveAffirmations { get; set; }
    public string ActionableInsights { get; set; }
    public DateTime EmailSendAt { get; set; }
    public bool IsEmailSent { get; set; }


}
