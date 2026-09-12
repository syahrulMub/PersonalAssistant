using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class ActivityLogs
{
    [Key]
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public string Category { get; set; }
    public bool IsReminder { get; set; }
    public DateTime ReminderTime { get; set; }
    public DateTime CreateAt { get; set; }
    public bool IsCompleted { get; set; }
    public virtual int UserId { get; set; }
    public User User { get; set; }

}
