using AIPersonalAssistant.EmailServices;
using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestEmailController : ControllerBase
{
    private readonly IEmailSevice _emailService;
    private readonly ILogger<TestEmailController> _logger;

    public TestEmailController(IEmailSevice emailService, ILogger<TestEmailController> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    [HttpPost("send-test-email")]
    public async Task<IActionResult> SendTestEmail([FromQuery] string? recipientEmail = null)
    {
        try
        {
            _logger.LogInformation("TestEmailController.SendTestEmail called. recipientEmail={RecipientEmail}", recipientEmail);

            string subject = "Test Email from MindEcho Assistant";
            string htmlBody = "<h1>This is a test email from MindEcho Assistant</h1><p>If you received this email, the email service is working correctly.</p>";
            var isSuccess = await _emailService.SendEmailAsync(subject, htmlBody, recipientEmail);

            if (isSuccess)
            {
                _logger.LogInformation("TestEmailController.SendTestEmail completed successfully.");
                return Ok("Test email sent successfully.");
            }

            _logger.LogWarning("TestEmailController.SendTestEmail failed to send email.");
            return BadRequest("Failed to send test email.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TestEmailController.SendTestEmail failed.");
            return StatusCode(500, "Error sending test email.");
        }
    }
}
