using System.Reflection.Metadata;
using AIPersonalAssistant.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<UserController> _logger;

    public UserController(AppDbContext context, ILogger<UserController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 5;
            if (pageSize > 100) pageSize = 100;
            var users = await _context.Users
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
            _logger.LogInformation("success get list of users");
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError("error get list user");
            return StatusCode(500, "Error get list user.");
        }
    }

    [HttpPut("approve/{userId}")]
    public async Task<IActionResult> ApproveUser(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound(new { message = "User tidak ditemukan." });

        user.IsApproved = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"User {user.Email} berhasil di-approve." });
    }
}
