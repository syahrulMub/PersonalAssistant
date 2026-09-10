using AIPersonalAssistant.EmailServices;
using Microsoft.AspNetCore.Mvc;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestEmailController : ControllerBase
{
    private readonly IEmailSevice _emailService;


    public TestEmailController(IEmailSevice emailService)
    {
        _emailService = emailService;
    }

    [HttpPost("send-test-email")]
    public async Task<IActionResult> SendTestEmail([FromQuery] string recipientEmail = null)
    {
        string subject = "Test Email from MindEcho Assistant";
        string htmlBody = "<h1>This is a test email from MindEcho Assistant</h1><p>If you received this email, the email service is working correctly.</p>";
        var isSuccess = await _emailService.SendEmailAsync(subject, htmlBody, recipientEmail);
        return isSuccess ? Ok("Test email sent successfully.") : BadRequest("Failed to send test email.");
    }
}
