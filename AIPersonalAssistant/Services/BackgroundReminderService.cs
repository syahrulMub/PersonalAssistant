using AIPersonalAssistant.Data;
using AIPersonalAssistant.Models;
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
        var listUser = await dbContext.Users.ToListAsync();

        var targetWindow = DateTime.Now.AddMinutes(10);
        foreach (var user in listUser)
        {

            var isFeatureEnabled = await dbContext.UserAIFeatures
                .AnyAsync(uf => uf.UserId == user.Id && uf.FeatureId == 1 && uf.IsEnabled);

            if (!isFeatureEnabled)
            {
                continue;
            }


            var dueActivities = await dbContext.ActivityLogs
            .Where(a => a.ReminderTime > DateTime.MinValue && a.ReminderTime <= targetWindow && a.IsReminder && user.Id == a.UserId)
            .Take(10)
            .ToListAsync();

            foreach (var activity in dueActivities)
            {
                var now = DateTime.Now;
                int hour = now.Hour;
                bool isNight = hour >= 18 || hour < 6;

                // 1. Variasi Banner Berdasarkan Waktu
                string headerIcon = isNight ? "🌙" : "☀️";
                string headerTitle = isNight ? "Night Reminder" : "Daytime Reminder";
                string headerPillText = isNight ? "STAY CALM & WRAP UP" : "STAY FOCUSED & EXECUTE";

                // Gradien: Malam (Deep Navy/Indigo) vs Siang (Vibrant Sky Blue/Azure)
                string headerGradient = isNight
                    ? "background: #1e1b4b; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%);"
                    : "background: #1d4ed8; background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #38bdf8 100%);";

                // 2. Format Tanggal Indonesia
                var culture = new System.Globalization.CultureInfo("id-ID");
                string headerDate = now.ToString("dddd, dd MMM yyyy", culture);
                string fullTimeStr = now.ToString("• HH:mm", culture) + " WIB";

                // Subjek email aman spam (emoji diletakkan di akhir atau tengah)
                string subject = $"[Pengingat] {activity.Title} ({now:dd MMM})";

                string bodyHtml = $@"
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    </head>
    <body style='margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif;'>
        <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='max-width: 580px; margin: 0 auto;'>
            
            <!-- HEADER BANNER: GRADIENT CARD -->
            <tr>
                <td style='border-radius: 16px; padding: 28px 24px; {headerGradient} box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.12);'>
                    <div style='font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;'>
                        {headerIcon} {headerTitle}
                    </div>
                    <div style='font-size: 13px; color: rgba(255, 255, 255, 0.85); margin-top: 4px; font-weight: 500;'>
                        {headerDate}
                    </div>
                    <div style='margin-top: 14px;'>
                        <span style='display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.25); color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 12px; border-radius: 9999px;'>
                            {headerPillText}
                        </span>
                    </div>
                </td>
            </tr>

            <!-- CARD 1: DETAIL TUGAS UTAMA (SUMMARY STYLE) -->
            <tr>
                <td style='padding-top: 16px;'>
                    <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 5px solid #3b82f6; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);'>
                        <tr>
                            <td style='padding: 18px 20px;'>
                                <div style='font-size: 11px; font-weight: 700; color: #2563eb; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;'>
                                    📋 DETAIL AKTIVITAS
                                </div>
                                <h3 style='margin: 0 0 6px 0; font-size: 17px; font-weight: 700; color: #0f172a;'>
                                    {activity.Title}
                                </h3>
                                <p style='margin: 0; font-size: 14px; line-height: 1.6; color: #475569;'>
                                    {(string.IsNullOrWhiteSpace(activity.Description) ? "Tidak ada deskripsi tambahan." : activity.Description)}
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- CARD 2: JADWAL & KATEGORI (ACCENT STYLE) -->
            <tr>
                <td style='padding-top: 12px;'>
                    <table role='presentation' border='0' cellpadding='0' cellspacing='0' width='100%' style='background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 5px solid #8b5cf6; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);'>
                        <tr>
                            <td style='padding: 18px 20px;'>
                                <div style='font-size: 11px; font-weight: 700; color: #7c3aed; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px;'>
                                    ⚡ INFORMASI JADWAL
                                </div>
                                
                                <div style='font-size: 13px; color: #334155; margin-bottom: 8px;'>
                                    <span style='color: #64748b; font-weight: 500;'>Waktu:</span> 
                                    <strong style='color: #0f172a;'>{fullTimeStr}</strong>
                                </div>

                                <div style='font-size: 13px; color: #334155;'>
                                    <span style='color: #64748b; font-weight: 500;'>Kategori:</span>
                                    <span style='display: inline-block; margin-left: 6px; background-color: #ede9fe; color: #6d28d9; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 9999px;'>
                                        🏷️ {(!string.IsNullOrEmpty(activity.Category) ? activity.Category : "Umum")}
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>

            <!-- FOOTER -->
            <tr>
                <td style='padding: 24px 12px 12px 12px; text-align: center;'>
                    <p style='margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #64748b;'>
                        AI Personal Assistant
                    </p>
                    <p style='margin: 0; font-size: 11px; color: #94a3b8;'>
                        Pemberitahuan otomatis • Mohon jangan membalas email ini (No-Reply)
                    </p>
                </td>
            </tr>

        </table>
    </body>
    </html>";

                var sendEmail = await emailService.SendEmailAsync(subject, bodyHtml, user.Email);
                if (sendEmail)
                {
                    activity.IsReminder = false;
                    dbContext.ActivityLogs.Update(activity);
                }
            }
        }

        await dbContext.SaveChangesAsync();
    }
}