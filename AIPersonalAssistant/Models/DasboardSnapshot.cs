namespace AIPersonalAssistant.Models;

public class DasboardSnapshot
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.Now;
    public string PayloadJson { get; set; } = string.Empty;
}
