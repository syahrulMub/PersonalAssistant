using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestGeminiController : ControllerBase
{
    private readonly AIGeminiService _aiGeminiService;

    public TestGeminiController(AIGeminiService aiGeminiService)
    {
        _aiGeminiService = aiGeminiService;
    }

    [HttpPost("generate-content")]
    public async Task<IActionResult> GenerateContent([FromBody] string prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt))
        {
            return BadRequest("Prompt cannot be empty.");
        }

        try
        {
            await _aiGeminiService.GenerateDailySummaryAsync();
            return Ok();
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error generating content: {ex.Message}");
        }
    }
}
