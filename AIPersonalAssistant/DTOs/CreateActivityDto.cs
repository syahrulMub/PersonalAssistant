using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.DTOs;

public class CreateActivityDto
{
    [Required(ErrorMessage = "Title required")]
    [StringLength(150, ErrorMessage = "Title maximum 150 characters")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Content required")]
    [StringLength(1000, ErrorMessage = "Content maximum 1000 characters")]
    public string Content { get; set; } = string.Empty;

    public string Category { get; set; } = "General";
    public DateTime? RemindAt { get; set; }
}
