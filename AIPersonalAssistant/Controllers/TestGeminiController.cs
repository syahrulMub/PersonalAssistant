using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestGeminiController : ControllerBase
{
    private readonly AIGeminiService _aiGeminiService;
    private readonly ILogger<TestGeminiController> _logger;

    public TestGeminiController(AIGeminiService aiGeminiService, ILogger<TestGeminiController> logger)
    {
        _aiGeminiService = aiGeminiService;
        _logger = logger;
    }

    [HttpPost("generate-content")]
    public async Task<IActionResult> GenerateContent([FromBody] string prompt)
    {
        try
        {
            _logger.LogInformation("TestGeminiController.GenerateContent called.");

            if (string.IsNullOrWhiteSpace(prompt))
            {
                _logger.LogWarning("TestGeminiController.GenerateContent received empty prompt.");
                return BadRequest("Prompt cannot be empty.");
            }

            await _aiGeminiService.ExecuteGeminiApi("test API");
            _logger.LogInformation("TestGeminiController.GenerateContent completed.");
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TestGeminiController.GenerateContent failed.");
            return StatusCode(500, $"Error generating content: {ex.Message}");
        }
    }
}
