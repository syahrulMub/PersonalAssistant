using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class TracebackMemory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    public int CurrentTurn { get; set; } = 1;
    public int MaxTurns { get; set; } = 4;
    public bool IsCompleted { get; set; } = false;

    // Menyimpan array JSON teks percakapan (List<VoiceTurnItemDto>)
    public string ConversationHistoryJson { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
