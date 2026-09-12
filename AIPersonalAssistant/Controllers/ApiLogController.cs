using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/[controller]")]
public class ApiLogController : ControllerBase
{
    private readonly ApiLogService _apiLogService;

    public ApiLogController(ApiLogService apiLogService)
    {
        _apiLogService = apiLogService;
    }

    [HttpGet]
    public IActionResult GetLogs([FromQuery] string? date = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        var selectedDate = string.IsNullOrWhiteSpace(date)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : date;

        var logs = _apiLogService.ReadLogs(page, pageSize, selectedDate);
        var total = _apiLogService.GetLogCount(selectedDate);
        var dates = _apiLogService.GetLogDates();

        return Ok(new
        {
            date = selectedDate,
            availableDates = dates,
            page,
            pageSize,
            total,
            logs
        });
    }
}
