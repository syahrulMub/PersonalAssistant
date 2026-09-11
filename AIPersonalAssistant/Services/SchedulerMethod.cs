using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.EmailServices;
using AIPersonalAssistant.Models;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;


public class SchedulerMethod
{
    private readonly ILogger<SchedulerMethod> _logger;
    private readonly IEmailSevice _emailService;
    private readonly AIGeminiService _aiService;
    private readonly AppDbContext _dbContext;
    private readonly AiRecapService _aiRecapService;

    public SchedulerMethod(ILogger<SchedulerMethod> logger, IEmailSevice emailService, AIGeminiService aiService, AppDbContext dbContext, AiRecapService aiRecapService)
    {
        _logger = logger;
        _emailService = emailService;
        _aiService = aiService;
        _dbContext = dbContext;
        _aiRecapService = aiRecapService;
    }

    public async Task GenerateNightSummaryAsync()
    {
        var treedayago = DateTime.UtcNow.AddDays(-3);
        var logs = await _dbContext.ActivityLogs
            .Where(a => a.CreateAt.Date <= DateTime.Now.Date && a.CreateAt.Date >= treedayago.Date)
            .OrderBy(a => a.ReminderTime)
            .ToListAsync();
        var activitiesText = string.Join("\n", logs.Select(l => $"- {l.Title} {l.Description} {l.CreateAt}"));

        string prompt = $@"
                        Kamu adalah asisten pribadi pintar, suportif, dan reflektif.
                        Tugasmu adalah menganalisis seluruh aktivitas user hari ini untuk memberikan evaluasi penutup hari, rasa puas atas usaha yang telah dilakukan, serta ketenangan sebelum beristirahat.

                        Daftar Aktivitas Hari Ini:
                        {activitiesText}

                        Instruksi Output:
                        Kembalikan respon HANYA berupa JSON valid tanpa blok markdown (tanpa ```json ... ```) dan tanpa teks pembuka/penutup apapun.

                        Format JSON wajib:
                        {{
                        ""summaryText"": ""Ulasan reflektif dan hangat mengenai pencapaian serta apa saja yang berhasil diselesaikan user hari ini."",
                        ""positiveAffirmations"": ""Apresiasi tulus atas kerja keras user hari ini, validasi rasa lelahnya, dan kata penenang agar user merasa puas serta siap beristirahat."",
                        ""actionableInsights"": ""1-2 evaluasi santai atau catatan prioritas yang bisa disiapkan untuk esok hari agar tidur lebih tenang tanpa beban pikiran.""
                        }}";

        var rawResponse = await _aiService.ExecuteGeminiApi(prompt);
        var cleanJson = rawResponse.Replace("```json", "").Replace("```", "").Trim();
        _logger.LogInformation("Generated JSON: {Json}", cleanJson);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = JsonSerializer.Deserialize<DailySummaryAiDto>(cleanJson, options);
        if (result == null)
        {
            _logger.LogError("Night summary JSON could not be deserialized: {Json}", cleanJson);
            return;
        }

        await _aiRecapService.SaveRecapAsync(result);

        //send email
        string subject = "Night Summary from AI Assistant";
        string body = BuildNightSummaryHtml(result.SummaryText, result.PositiveAffirmations, result.ActionableInsights);
        await _emailService.SendEmailAsync(subject, body, string.Empty);
    }

    private string BuildNightSummaryHtml(string summaryText, string positiveAffirmations, string actionableInsights)
    {
        var currentDate = DateTime.Now.ToString("dddd, dd MMMM yyyy", new System.Globalization.CultureInfo("id-ID"));

        return $@"
            <!DOCTYPE html>
            <html lang=""id"">
            <head>
            <meta charset=""UTF-8"">
            <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
            <style>
                body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f3f4f6;
                margin: 0;
                padding: 24px;
                color: #1f2937;
                }}
                .container {{
                max-width: 680px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }}
                .header {{
                background: linear-gradient(135deg, #1f2a44 0%, #4338ca 100%);
                padding: 32px 28px;
                text-align: left;
                color: #ffffff;
                }}
                .header h1 {{
                margin: 0;
                font-size: 22px;
                font-weight: 700;
                letter-spacing: -0.02em;
                }}
                .header p {{
                margin: 6px 0 0;
                font-size: 13px;
                opacity: 0.9;
                }}
                .tag {{
                display: inline-block;
                margin-top: 14px;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(255,255,255,0.16);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                }}
                .content {{
                padding: 28px;
                }}
                .card {{
                background-color: #ffffff;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid #e5e7eb;
                }}
                .card-title {{
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0 0 10px;
                display: flex;
                align-items: center;
                }}
                .card-body {{
                font-size: 15px;
                line-height: 1.6;
                color: #374151;
                white-space: pre-line;
                margin: 0;
                }}
                .summary-box {{
                border-left: 4px solid #4f46e5;
                background-color: #f8fafc;
                }}
                .summary-box .card-title {{
                color: #4f46e5;
                }}
                .affirmation-box {{
                border-left: 4px solid #db2777;
                background-color: #fdf2f8;
                }}
                .affirmation-box .card-title {{
                color: #db2777;
                }}
                .insight-box {{
                border-left: 4px solid #059669;
                background-color: #ecfdf5;
                }}
                .insight-box .card-title {{
                color: #059669;
                }}
                .footer {{
                padding: 20px 28px;
                background-color: #f9fafb;
                border-top: 1px solid #f3f4f6;
                text-align: center;
                font-size: 12px;
                color: #9ca3af;
                }}
                .footer strong {{
                color: #111827;
                }}
                .footnote {{
                margin-top: 8px;
                color: #6b7280;
                font-style: italic;
                }}
            </style>
            </head>
            <body>
            <div class=""container"">
                <div class=""header"">
                <h1>🌙 Night Reflection</h1>
                <p>{currentDate}</p>
                <span class=""tag"">Close the day with calm reflection</span>
                </div>

                <div class=""content"">
                <div class=""card summary-box"">
                    <div class=""card-title"">📋 Summary</div>
                    <p class=""card-body"">{summaryText}</p>
                </div>

                <div class=""card affirmation-box"">
                    <div class=""card-title"">💖 Positive Note</div>
                    <p class=""card-body"">{positiveAffirmations}</p>
                </div>

                <div class=""card insight-box"">
                    <div class=""card-title"">🚀 Next Step</div>
                    <p class=""card-body"">{actionableInsights}</p>
                </div>
                </div>

                <div class=""footer"">
                <div>Dikirim secara otomatis oleh <strong>AI Personal Assistant</strong></div>
                <div class=""footnote"">Let this night settle softly. From AI Assistant</div>
                </div>
            </div>
            </body>
            </html>";
    }

    private string BuildMorningSummaryHtml(string summaryText, string positiveAffirmations, string actionableInsights)
    {
        var currentDate = DateTime.Now.ToString("dddd, dd MMMM yyyy", new System.Globalization.CultureInfo("id-ID"));

        return $@"
            <!DOCTYPE html>
            <html lang=""id"">
            <head>
            <meta charset=""UTF-8"">
            <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
            <style>
                body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f3f4f6;
                margin: 0;
                padding: 24px;
                color: #1f2937;
                }}
                .container {{
                max-width: 680px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                }}
                .header {{
                background: linear-gradient(135deg, #ff9a3d 0%, #ff6b6b 100%);
                padding: 32px 28px;
                text-align: left;
                color: #ffffff;
                }}
                .header h1 {{
                margin: 0;
                font-size: 22px;
                font-weight: 700;
                letter-spacing: -0.02em;
                }}
                .header p {{
                margin: 6px 0 0;
                font-size: 13px;
                opacity: 0.9;
                }}
                .tag {{
                display: inline-block;
                margin-top: 14px;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(255,255,255,0.16);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
                }}
                .content {{
                padding: 28px;
                }}
                .card {{
                background-color: #ffffff;
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 20px;
                border: 1px solid #e5e7eb;
                }}
                .card-title {{
                font-size: 14px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0 0 10px;
                display: flex;
                align-items: center;
                }}
                .card-body {{
                font-size: 15px;
                line-height: 1.6;
                color: #374151;
                white-space: pre-line;
                margin: 0;
                }}
                .summary-box {{
                border-left: 4px solid #ff7a18;
                background-color: #fffaf5;
                }}
                .summary-box .card-title {{
                color: #ff7a18;
                }}
                .affirmation-box {{
                border-left: 4px solid #e11d48;
                background-color: #fff1f2;
                }}
                .affirmation-box .card-title {{
                color: #e11d48;
                }}
                .insight-box {{
                border-left: 4px solid #10b981;
                background-color: #ecfdf5;
                }}
                .insight-box .card-title {{
                color: #10b981;
                }}
                .footer {{
                padding: 20px 28px;
                background-color: #f9fafb;
                border-top: 1px solid #f3f4f6;
                text-align: center;
                font-size: 12px;
                color: #9ca3af;
                }}
                .footer strong {{
                color: #111827;
                }}
                .footnote {{
                margin-top: 8px;
                color: #6b7280;
                font-style: italic;
                }}
            </style>
            </head>
            <body>
            <div class=""container"">
                <div class=""header"">
                <h1>🌅 Morning Focus Brief</h1>
                <p>{currentDate}</p>
                <span class=""tag"">Plan your direction for a productive day</span>
                </div>

                <div class=""content"">
                <div class=""card summary-box"">
                    <div class=""card-title"">📋 Summary</div>
                    <p class=""card-body"">{summaryText}</p>
                </div>

                <div class=""card affirmation-box"">
                    <div class=""card-title"">💖 Positive Note</div>
                    <p class=""card-body"">{positiveAffirmations}</p>
                </div>

                <div class=""card insight-box"">
                    <div class=""card-title"">🚀 Next Step</div>
                    <p class=""card-body"">{actionableInsights}</p>
                </div>
                </div>

                <div class=""footer"">
                <div>Dikirim secara otomatis oleh <strong>AI Personal Assistant</strong></div>
                <div class=""footnote"">Let’s make today counted. From AI Assistant</div>
                </div>
            </div>
            </body>
            </html>";
    }

    public async Task GenerateMorningSummaryAsync()
    {
        var treedayago = DateTime.UtcNow.AddDays(-1);
        var logs = await _dbContext.ActivityLogs
            .Where(a => a.CreateAt.Date <= DateTime.Now.Date && a.CreateAt.Date >= treedayago.Date)
            .OrderBy(a => a.ReminderTime)
            .ToListAsync();
        var activitiesText = string.Join("\n", logs.Select(l => $"- {l.Title} {l.Description} {l.CreateAt}"));

        string prompt = $@"
                            Kamu adalah asisten pribadi pintar, penuh energi, dan berorientasi pada aksi.
                            Tugasmu adalah menyambut user di awal hari, membakar semangat produktivitas, serta membantu memetakan fokus utama berdasarkan agenda atau catatan tugas yang ada.

                            Daftar Rencana/Agenda Hari Ini:
                            {activitiesText}

                            Instruksi Output:
                            Kembalikan respon HANYA berupa JSON valid tanpa blok markdown (tanpa ```json ... ```) dan tanpa teks pembuka/penutup apapun.

                            Format JSON wajib:
                            {{
                            ""summaryText"": ""Gambaran singkat dan terstruktur mengenai fokus utama serta target yang perlu diselesaikan user hari ini."",
                            ""positiveAffirmations"": ""Kalimat pembakar semangat yang segar, optimis, dan membangun kepercayaan diri user untuk menaklukkan hari ini."",
                            ""actionableInsights"": ""Strategi taktis memulai hari (misal: teknik 'eat the frog' pada tugas terberat, pembagian time-block, atau tips menjaga fokus).""
                            }}";

        var rawResponse = await _aiService.ExecuteGeminiApi(prompt);
        var cleanJson = rawResponse.Replace("```json", "").Replace("```", "").Trim();
        _logger.LogInformation("Generated JSON: {Json}", cleanJson);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = JsonSerializer.Deserialize<DailySummaryAiDto>(cleanJson, options);
        if (result == null)
        {
            _logger.LogError("Morning summary JSON could not be deserialized: {Json}", cleanJson);
            return;
        }

        await _aiRecapService.SaveRecapAsync(result);

        //send email
        string subject = "Morning Summary from AI Assistant";
        string body = BuildMorningSummaryHtml(result.SummaryText, result.PositiveAffirmations, result.ActionableInsights);
        await _emailService.SendEmailAsync(subject, body, string.Empty);
    }
}