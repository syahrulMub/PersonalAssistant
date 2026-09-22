using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class AIDailySummary
{
    [Key]
    public int Id { get; set; }
    public string BriefingDate { get; set; } = string.Empty;
    public string SummaryType { get; set; } = string.Empty;
    public string ContentJson { get; set; } = string.Empty;
    public DateTime? EmailSendAt { get; set; }
    public bool IsEmailSent { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual int UserId { get; set; }
    public User User { get; set; }

}
