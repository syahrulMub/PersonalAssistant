using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class ActivityLogs
{
    [Key]
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string Category { get; set; }

    public string Status { get; set; } = "Pending";
    public bool IsReminder { get; set; }
    public DateTime? ReminderTime { get; set; }
    public DateTime? OriginalReminderTime { get; set; }
    public int RescheduleCount { get; set; } = 0;

    public DateTime CreateAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? MemorySyncedAt { get; set; }
    public string? ResolutionSource { get; set; } // misal: "VoiceReflection", "ManualUI", "EmailDigest"
    public string? Note { get; set; }
    public virtual int UserId { get; set; }
    public User User { get; set; }

}
