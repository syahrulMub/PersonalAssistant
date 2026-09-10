namespace AIPersonalAssistant.EmailServices;

public interface IEmailSevice
{
    Task<bool> SendEmailAsync(string subject, string body, string recipientEmail);
}
