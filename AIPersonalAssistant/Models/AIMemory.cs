using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class AIMemory
{
    [Key]
    public int Id { get; set; }
    [Required]
    public int UserId { get; set; }
    [Required]
    [MaxLength(50)]
    public string MemoryType { get; set; } = null!;
    [Required]
    [MaxLength(100)]
    public string Subject { get; set; } = null!;
    [Required]
    [MaxLength(100)]
    public string Key { get; set; } = null!;
    [Required]
    public string ValueJson { get; set; } = "{}";
    public double Confidence { get; set; }
    public int EvidenceCount { get; set; }
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Active";
    [Required]
    [MaxLength(50)]
    public string Source { get; set; } = null!;

    public DateTime FirstObservedAt { get; set; }

    public DateTime LastObservedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
    public virtual User user { get; set; }
    public ICollection<AIMemoryObservation> Observations { get; set; }
        = new List<AIMemoryObservation>();
}
