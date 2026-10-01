using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.Extension;
using AIPersonalAssistant.Models;
using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AIFeatureController> _logger;
    private readonly DashboardService _dashboardService;

    public DashboardController(AppDbContext dbContext, ILogger<AIFeatureController> logger, DashboardService dashboardService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDataDashboard()
    {
        try
        {
            int userId = User.GetUserId();
            if (userId == 0)
            {
                return Unauthorized(new { message = "User tidak valid." });
            }
            var result = await _dashboardService.GetSummaryDashboard(userId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard summary for user {UserId}", User.GetUserId());
            return StatusCode(500, new { message = "Terjadi kesalahan saat memuat data dashboard." });
        }
    }
}

