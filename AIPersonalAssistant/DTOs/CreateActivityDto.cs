using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.DTOs;

public class CreateActivityDto
{
    [Required(ErrorMessage = "Title required")]
    [StringLength(150, ErrorMessage = "Title maximum 150 characters")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description required")]
    [StringLength(1000, ErrorMessage = "Description maximum 1000 characters")]
    public string Description { get; set; } = string.Empty;

    public string Category { get; set; } = "General";
    public DateTime? RemindAt { get; set; }
}
