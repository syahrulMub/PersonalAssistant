using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class AIMemoryObservation
{
    [Key]
    public int Id { get; set; }

    public int AIMemoryId { get; set; }

    [Required]
    public int UserId { get; set; }
    [Required]
    [MaxLength(50)]
    public string SourceType { get; set; } = null!;
    public int? SourceId { get; set; }
    [Required]
    public string ObservationValue { get; set; } = null!;

    public double Weight { get; set; } = 1.0;

    public DateTime ObservedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public virtual User User { get; set; }

    public AIMemory AIMemory { get; set; } = null!;
}
