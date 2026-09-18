using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class UserReflection
{
    [Key]
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; }
    // Tipe refleksi bebas (misal: "Daily", "Weekly", "AdHocVoice", "Correction")
    public string ContextType { get; set; } = "Daily";
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public string? VoiceTranscript { get; set; }   // Teks hasil rekaman suara / input teks user

    // Output & Keputusan AI
    public string? AIFeedback { get; set; }        // Tanggapan/jawaban AI untuk user
    public string? ProcessedActionsJson { get; set; }
}
