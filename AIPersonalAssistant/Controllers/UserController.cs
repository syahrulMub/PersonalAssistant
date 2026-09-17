using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.Extension;
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

            var query = _context.Users.AsQueryable();
            var totalCount = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.IsApproved,
                    u.Role,
                    u.CreatedAt
                })
                .ToListAsync();

            var result = new PagedResultDto<object>
            {
                Items = users.Cast<object>().ToList(),
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            _logger.LogInformation("success get list of users");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "error get list user");
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

    [HttpDelete("{userId}")]
    public async Task<IActionResult> DeleteUser(int userId)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User tidak ditemukan." });
            }

            int currentUserId = User.GetUserId();
            if (currentUserId > 0 && currentUserId == userId)
            {
                return BadRequest(new { message = "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif." });
            }

            if (user.Id == 1)
            {
                return BadRequest(new { message = "Akun Admin utama tidak dapat dihapus." });
            }

            // Bersihkan data relasi terkait untuk mencegah konflik foreign key / restrict
            var memoryObservations = _context.AIMemoryObservations.Where(o => o.UserId == userId);
            _context.AIMemoryObservations.RemoveRange(memoryObservations);

            var memories = _context.AIMemories.Where(m => m.UserId == userId);
            _context.AIMemories.RemoveRange(memories);

            var userFeatures = _context.UserAIFeatures.Where(uf => uf.UserId == userId);
            _context.UserAIFeatures.RemoveRange(userFeatures);

            var userReflections = _context.UserReflections.Where(ur => ur.UserId == userId);
            _context.UserReflections.RemoveRange(userReflections);

            var activityLogs = _context.ActivityLogs.Where(a => a.UserId == userId);
            _context.ActivityLogs.RemoveRange(activityLogs);

            var aiRecaps = _context.AIRecaps.Where(r => r.UserId == userId);
            _context.AIRecaps.RemoveRange(aiRecaps);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("User with ID {UserId} ({Email}) successfully deleted.", userId, user.Email);
            return Ok(new { message = $"User {user.Email} berhasil dihapus." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user with ID {UserId}", userId);
            return StatusCode(500, new { message = "Terjadi kesalahan pada server saat menghapus user." });
        }
    }
}
