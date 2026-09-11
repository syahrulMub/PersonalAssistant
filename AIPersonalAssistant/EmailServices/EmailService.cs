using MailKit.Net.Smtp;
using AIPersonalAssistant.Configurations;
using AIPersonalAssistant.Services;
using Microsoft.Extensions.Options;

namespace AIPersonalAssistant.EmailServices;

public class EmailService : IEmailSevice
{
    private readonly EmailSettings _emailSettings;
    private readonly ILogger<EmailService> _logger;
    private readonly ApiLogService _apiLogService;

    public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger, ApiLogService apiLogService)
    {
        _emailSettings = emailSettings.Value;
        _logger = logger;
        _apiLogService = apiLogService;
    }
    public async Task<bool> SendEmailAsync(string subject, string body, string recipientEmail)
    {
        var recipient = string.IsNullOrEmpty(recipientEmail) ? _emailSettings.RecipientEmail : recipientEmail;
        var message = new MimeKit.MimeMessage();
        message.From.Add(new MimeKit.MailboxAddress(_emailSettings.SenderName, _emailSettings.SenderEmail));
        message.To.Add(new MimeKit.MailboxAddress("User", recipient));
        message.Subject = subject;
        var BodyBuilder = new MimeKit.BodyBuilder()
        {
            HtmlBody = body
        };
        message.Body = BodyBuilder.ToMessageBody();
        using (var client = new SmtpClient())
        {
            try
            {
                _apiLogService.LogEmail($"Preparing email send. Subject={subject} Recipient={recipient}", subject, recipient, "EmailService", "SendEmailAsync");

                await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.Port, MailKit.Security.SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(_emailSettings.SenderEmail, _emailSettings.Password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation($"Email sent to {recipient} with subject: {subject}");
                _apiLogService.LogEmail($"Email sent successfully. Subject={subject} Recipient={recipient}", subject, recipient, "EmailService", "SendEmailAsync");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Recipient} with subject {Subject}", recipient, subject);
                _apiLogService.LogEmailError(ex, subject, recipient, "EmailService", "SendEmailAsync");
                return false;
            }
        }
    }
}
