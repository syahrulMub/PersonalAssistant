using System.ComponentModel.DataAnnotations;

namespace AIPersonalAssistant.Models;

public class User
{
    [Key]
    public int Id { get; set; }

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public bool IsApproved { get; set; } = false;

    public string Role { get; set; } = "User";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

}
