using AIPersonalAssistant.Data;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class BackgroundReminderService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackgroundReminderService> _logger;
    private readonly TimeSpan _lastRunTimeStamp = TimeSpan.FromMinutes(1); // Set the interval to 1 minute

    public BackgroundReminderService(IServiceProvider serviceProvider, ILogger<BackgroundReminderService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }


    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProccessDueReminder();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while processing due reminders.");
            }

            await Task.Delay(_lastRunTimeStamp, stoppingToken);
        }
    }

    private async Task ProccessDueReminder()
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<EmailServices.IEmailSevice>();

        var targetWindow = DateTime.Now.AddMinutes(10);
        var dueActivities = await dbContext.ActivityLogs
            .Where(a => a.ReminderTime > DateTime.MinValue && a.ReminderTime <= targetWindow && a.IsReminder)
            .Take(10)
            .ToListAsync();

        foreach (var activity in dueActivities)
        {
            string subject = $"🔔 Reminder Aktivitas: {activity.Title}";
            string bodyHtml = $@"
                <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                    <h2 style='color: #2b6cb0;'>Waktunya Pengingat!</h2>
                    <p>Halo, ini adalah pengingat untuk aktivitas yang telah kamu jadwalkan:</p>
                    <div style='background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 15px; margin: 15px 0;'>
                        <h3 style='margin: 0 0 10px 0;'>{activity.Title}</h3>
                        <p style='margin: 0;'>{activity.Description}</p>
                    </div>
                    <p><small style='color: #718096;'>Kategori: {activity.Category}</small></p>
                    <hr style='border: none; border-top: 1px solid #e2e8f0;' />
                    <small style='color: #a0aec0;'>Dikirim otomatis oleh AI Personal Assistant</small>
                </div>";
            var sendEmail = await emailService.SendEmailAsync(subject, bodyHtml, null);
            if (sendEmail)
            {
                activity.IsReminder = false;
                dbContext.ActivityLogs.Update(activity);
            }
        }
        await dbContext.SaveChangesAsync();
    }
}