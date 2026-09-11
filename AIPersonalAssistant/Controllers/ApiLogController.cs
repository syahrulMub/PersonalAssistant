using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

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
    public IActionResult GetLogs([FromQuery] string? date = null, [FromQuery] int take = 100)
    {
        var selectedDate = string.IsNullOrWhiteSpace(date)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : date;

        var logs = _apiLogService.ReadLogs(take, selectedDate);
        var dates = _apiLogService.GetLogDates();

        return Ok(new
        {
            date = selectedDate,
            availableDates = dates,
            logs
        });
    }
}
