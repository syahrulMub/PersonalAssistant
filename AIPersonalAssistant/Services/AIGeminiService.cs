using System.Text;
using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.EmailServices;
using AIPersonalAssistant.Models;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class AIGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly string? _apiKey;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AIGeminiService> _logger;
    private readonly IEmailSevice _emailService;
    private readonly ApiLogService _apiLogService;

    public AIGeminiService(HttpClient httpClient, IConfiguration configuration, AppDbContext dbContext, ILogger<AIGeminiService> logger, IEmailSevice emailService, ApiLogService apiLogService)
    {
        _httpClient = httpClient;
        _apiKey = configuration["Gemini:ApiKey"];
        _dbContext = dbContext;
        _logger = logger;
        _emailService = emailService;
        _apiLogService = apiLogService;
    }

    public async Task GenerateDailySummaryAsync()
    {
        var dailySummary = await GenerateResponseSummaryAsync();

        var recap = new AIRecap
        {
            CreatedAt = DateTime.UtcNow,
            SummaryText = dailySummary.SummaryText,
            PositiveAffirmations = dailySummary.PositiveAffirmations,
            ActionableInsights = dailySummary.ActionableInsights,
            EmailSendAt = DateTime.UtcNow.AddHours(1),
            IsEmailSent = false
        };

        _dbContext.AIRecaps.Add(recap);
        await _dbContext.SaveChangesAsync();

        //send email
        string subject = "Daily Summary from AI Assistant";
        string body = BuildDailySummaryHtml(dailySummary.SummaryText, dailySummary.PositiveAffirmations, dailySummary.ActionableInsights);
        await _emailService.SendEmailAsync(subject, body, string.Empty);

    }
    public async Task<DailySummaryAiDto> GenerateResponseSummaryAsync()
    {
        var treedayago = DateTime.UtcNow.AddDays(-3);
        var logs = await _dbContext.ActivityLogs
            .Where(a => a.CreateAt.Date <= DateTime.Now.Date && a.CreateAt.Date >= treedayago.Date)
            .OrderBy(a => a.ReminderTime)
            .ToListAsync();
        var activitiesText = string.Join("\n", logs.Select(l => $"- [{l.ReminderTime:HH:mm}] {l.Title} {l.Description}"));


        var prompt = $@"
                        Kamu adalah asisten pribadi pintar. Analisis seluruh daftar aktivitas user hari ini dan berikan output HANYA berupa JSON valid tanpa format markdown atau teks pembuka/penutup.

                        Aktivitas User Hari Ini:
                        {activitiesText}

                        Format JSON wajib:
                        {{
                        ""summaryText"": ""Ringkasan menyeluruh mengenai apa saja yang telah dikerjakan user hari ini"",
                        ""positiveAffirmations"": ""Kata-kata afirmasi positif dan apresiasi atas usaha/pencapaian user hari ini"",
                        ""actionableInsights"": ""Insight atau saran tindakan konkret yang bisa dilakukan besok agar lebih produktif""
                        }}";

        var rawResponse = await GenerateContentAsync(prompt);
        var cleanJson = rawResponse.Replace("```json", "").Replace("```", "").Trim();
        _logger.LogInformation("Generated JSON: {Json}", cleanJson);
        _apiLogService.LogThirdParty("Gemini", "generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", "POST", 200, "Gemini response parsed successfully.", null, cleanJson, "AIGeminiService", "GenerateResponseSummaryAsync");
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var result = JsonSerializer.Deserialize<DailySummaryAiDto>(cleanJson, options);
        return result ?? new DailySummaryAiDto();
    }
    public async Task<string> GenerateContentAsync(string prompt)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured");
        }
        var requestBody = new
        {
            prompt = prompt,
            max_tokens = 100
        };

        var requestContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

        _httpClient.DefaultRequestHeaders.Authorization = null;
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={_apiKey}";
        var payload = new
        {
            contents = new[]
                    {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            }
        };
        var jsonPayload = JsonSerializer.Serialize(payload);
        HttpResponseMessage? response = null;

        _apiLogService.LogThirdParty("Gemini", url, "POST", null, "Gemini request started.", jsonPayload, null, "AIGeminiService", "GenerateContentAsync");

        for (int i = 0; i < 5; i++)
        {
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            response = await _httpClient.PostAsync(url, content);

            if (response.IsSuccessStatusCode || ((int)response.StatusCode != 503 && (int)response.StatusCode != 429))
            {
                break;
            }

            await Task.Delay(2000);
        }

        if (response == null || !response.IsSuccessStatusCode)
        {
            var errorContent = response != null
                ? await response.Content.ReadAsStringAsync()
                : "No response from server";

            _apiLogService.LogThirdParty("Gemini", url, "POST", (int?)response?.StatusCode, "Gemini request failed.", jsonPayload, errorContent, "AIGeminiService", "GenerateContentAsync");

            throw new InvalidOperationException($"Failed to generate content from Gemini API. Status Code: {response?.StatusCode}, Response: {errorContent}");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        _apiLogService.LogThirdParty("Gemini", url, "POST", (int?)response.StatusCode, "Gemini response received.", jsonPayload, responseContent, "AIGeminiService", "GenerateContentAsync");

        using var document = JsonDocument.Parse(responseContent);

        try
        {
            var parts = document.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts");
            var result = new StringBuilder();
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textElement))
                {
                    result.Append(textElement.GetString());
                }
            }
            return result.ToString();
        }
        catch (Exception ex)
        {
            _apiLogService.LogThirdParty("Gemini", url, "POST", (int?)response.StatusCode, "Gemini response parsing failed.", jsonPayload, responseContent, "AIGeminiService", "GenerateContentAsync");
            throw new InvalidOperationException("Failed to parse response from Gemini API.", ex);
        }
    }
    public static string BuildDailySummaryHtml(string summaryText, string positiveAffirmations, string actionableInsights)
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
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }}
    .header {{
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
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
      border-left: 4px solid #ec4899;
      background-color: #fdf2f8;
    }}
    .affirmation-box .card-title {{
      color: #db2777;
    }}
    .insight-box {{
      border-left: 4px solid #10b981;
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
  </style>
</head>
<body>
  <div class=""container"">
    <div class=""header"">
      <h1>✨ Rekap Harian & Refleksi</h1>
      <p>{currentDate}</p>
    </div>

    <div class=""content"">
      <!-- Ringkasan Hari Ini -->
      <div class=""card summary-box"">
        <div class=""card-title"">📋 Ringkasan Aktivitas</div>
        <p class=""card-body"">{summaryText}</p>
      </div>

      <!-- Afirmasi Positif -->
      <div class=""card affirmation-box"">
        <div class=""card-title"">💖 Afirmasi & Apresiasi Diri</div>
        <p class=""card-body"">{positiveAffirmations}</p>
      </div>

      <!-- Actionable Insights -->
      <div class=""card insight-box"">
        <div class=""card-title"">🚀 Rencana & Langkah Esok Hari</div>
        <p class=""card-body"">{actionableInsights}</p>
      </div>
    </div>

    <div class=""footer"">
      Dikirim secara otomatis oleh <strong>AI Personal Assistant</strong> • Istirahat yang cukup untuk hari esok!
    </div>
  </div>
</body>
</html>";
    }
}
