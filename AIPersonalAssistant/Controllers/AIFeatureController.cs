using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.Extension;
using AIPersonalAssistant.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AIFeatureController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AIFeatureController> _logger;

    public AIFeatureController(AppDbContext dbContext, ILogger<AIFeatureController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetFeatures()
    {
        try
        {
            int userId = User.GetUserId();
            if (userId == 0)
            {
                return Unauthorized(new { message = "User tidak valid." });
            }

            var features = await _dbContext.AIFeatures.ToListAsync();
            var userFeatures = await _dbContext.UserAIFeatures
                .Where(uf => uf.UserId == userId)
                .ToDictionaryAsync(uf => uf.FeatureId);

            var result = features.Select(f =>
            {
                var hasUserConfig = userFeatures.TryGetValue(f.Id, out var userConfig);
                return new UserAIFeatureResponseDto
                {
                    FeatureId = f.Id,
                    Key = f.Key,
                    Name = f.Name,
                    Description = f.Description,
                    IsEnabled = hasUserConfig && userConfig!.IsEnabled,
                    UpdatedAt = hasUserConfig ? userConfig!.UpdatedAt : null
                };
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting AI features for user {UserId}", User.GetUserId());
            return StatusCode(500, new { message = "Terjadi kesalahan saat memuat fitur AI." });
        }
    }

    [HttpPost("toggle")]
    public async Task<IActionResult> ToggleFeature([FromBody] ToggleAIFeatureRequestDto request)
    {
        try
        {
            int userId = User.GetUserId();
            if (userId == 0)
            {
                return Unauthorized(new { message = "User tidak valid." });
            }

            var feature = await _dbContext.AIFeatures.FindAsync(request.FeatureId);
            if (feature == null)
            {
                return NotFound(new { message = "Fitur AI tidak ditemukan." });
            }

            var userFeature = await _dbContext.UserAIFeatures
                .FirstOrDefaultAsync(uf => uf.UserId == userId && uf.FeatureId == request.FeatureId);

            if (userFeature == null)
            {
                // Mapping belum ada -> Buat baru (Insert)
                userFeature = new UserAIFeature
                {
                    UserId = userId,
                    FeatureId = request.FeatureId,
                    IsEnabled = request.IsEnabled,
                    UpdatedAt = DateTime.Now
                };
                _dbContext.UserAIFeatures.Add(userFeature);
            }
            else
            {
                // Mapping sudah ada -> Perbarui status (Update)
                userFeature.IsEnabled = request.IsEnabled;
                userFeature.UpdatedAt = DateTime.Now;
            }

            await _dbContext.SaveChangesAsync();

            return Ok(new
            {
                message = $"Fitur {feature.Name} berhasil di{(request.IsEnabled ? "aktifkan" : "nonaktifkan")}.",
                featureId = feature.Id,
                isEnabled = userFeature.IsEnabled,
                updatedAt = userFeature.UpdatedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling AI feature {FeatureId} for user {UserId}", request.FeatureId, User.GetUserId());
            return StatusCode(500, new { message = "Gagal memperbarui status fitur AI." });
        }
    }
}

