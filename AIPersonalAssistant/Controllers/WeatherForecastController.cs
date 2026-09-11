using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("[controller]")]
public class WeatherForecastController : ControllerBase
{
    private static readonly string[] Summaries = new[]
    {
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    };

    private readonly ILogger<WeatherForecastController> _logger;

    public WeatherForecastController(ILogger<WeatherForecastController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Get()
    {
        try
        {
            _logger.LogInformation("WeatherForecastController.Get called.");

            var reports = Enumerable.Range(1, 5).Select(index => new WeatherForecast
            {
                Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                TemperatureC = Random.Shared.Next(-20, 55),
                Summary = Summaries[Random.Shared.Next(Summaries.Length)]
            })
            .ToArray();

            _logger.LogInformation("WeatherForecastController.Get completed.");
            return Ok(reports);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "WeatherForecastController.Get failed.");
            return StatusCode(500, "Error retrieving weather forecast.");
        }
    }
}
