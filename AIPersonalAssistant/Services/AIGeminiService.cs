using System.Text;
using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.EmailServices;
using AIPersonalAssistant.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;

namespace AIPersonalAssistant.Services;

public class AIGeminiService
{
    private readonly HttpClient _httpClient;
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AIGeminiService> _logger;
    private readonly IEmailSevice _emailService;
    private readonly ApiLogService _apiLogService;
    private readonly IConfiguration _configuration;

    public AIGeminiService(HttpClient httpClient, IConfiguration configuration, AppDbContext dbContext, ILogger<AIGeminiService> logger, IEmailSevice emailService, ApiLogService apiLogService)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _dbContext = dbContext;
        _logger = logger;
        _emailService = emailService;
        _apiLogService = apiLogService;
    }

    public async Task<string> ExecuteGeminiApi(string prompt, string feature)
    {
        string? keyFeature = _configuration[$"Gemini:{feature}"];
        if (string.IsNullOrWhiteSpace(keyFeature))
        {
            throw new InvalidOperationException("Gemini API key is not configured");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={keyFeature}";
        var safeUrlForLog = url.Replace(keyFeature ?? string.Empty, "***REDACTED***");
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

        _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", null, "Gemini request started.", jsonPayload, null, "AIGeminiService", "ExecuteGeminiApi");

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));

        for (int i = 0; i < 3; i++)
        {
            var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
            try
            {
                response = await _httpClient.PostAsync(url, content, cts.Token);

                if (response.IsSuccessStatusCode || ((int)response.StatusCode != 503 && (int)response.StatusCode != 429))
                {
                    break;
                }
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException("Gemini API request timed out after 15 seconds.");
            }

            try
            {
                await Task.Delay(1000, cts.Token);
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException("Gemini API request timed out.");
            }
        }

        if (response == null || !response.IsSuccessStatusCode)
        {
            var errorContent = response != null
                ? await response.Content.ReadAsStringAsync()
                : "No response from server";

            _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int?)response?.StatusCode, "Gemini request failed.", jsonPayload, errorContent, "AIGeminiService", "ExecuteGeminiApi");

            throw new InvalidOperationException($"Gemini API returned {response?.StatusCode}: {errorContent}");
        }

        var responseContent = await response.Content.ReadAsStringAsync();
        _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int?)response.StatusCode, "Gemini response received.", jsonPayload, responseContent, "AIGeminiService", "ExecuteGeminiApi");

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
            _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int?)response.StatusCode, "Gemini response parsing failed.", jsonPayload, responseContent, "AIGeminiService", "ExecuteGeminiApi");
            throw new InvalidOperationException("Failed to parse response from Gemini API.", ex);
        }
    }

    public async Task<CreateActivityDto> ParseActivityFromSpeechAsync(string speechText, DateTime clientReferenceTime)
    {
        if (string.IsNullOrWhiteSpace(speechText))
        {
            throw new ArgumentException("Speech text cannot be empty.", nameof(speechText));
        }

        var currentTimeString = clientReferenceTime.ToString("yyyy-MM-dd HH:mm:ss");
        var dayOfWeek = clientReferenceTime.ToString("dddd", new System.Globalization.CultureInfo("id-ID"));

        var prompt = $@"
Kamu adalah asisten AI yang bertugas mengekstrak dan mem-parsing ucapan/suara pengguna menjadi model aktivitas terstruktur.
Waktu saat ini: {currentTimeString} WIB. Hari ini adalah hari: {dayOfWeek}.

Kalimat Masukan Pengguna (dari transkrip suara):
""{speechText}""

Aturan Ekstraksi:
1. 'title': Judul aktivitas yang ringkas dan jelas (maksimal 150 karakter).
2. 'description': Deskripsi aktivitas secara lengkap berdasarkan informasi yang diucapkan.
3. 'category': Pilih SATU kategori yang paling tepat dari daftar berikut:
   - 'Productivity' (pekerjaan, tugas kantor, meeting, deadline)
   - 'Learning' (belajar, membaca, kursus, riset)
   - 'Health' (olahraga, makan, istirahat, dokter, obat)
   - 'Personal' (keluarga, belanja, ibadah, hobi, urusan pribadi)
   - 'General' (lainnya)
4. 'isReminder': Bernilai true jika kalimat mengandung indikasi waktu/pengingat/jadwal (misal: 'besok jam 9', 'nanti sore', 'ingatkan saya'), atau false jika tidak ada waktu spesifik.
5. 'remindAt': Jika 'isReminder' bernilai true, hitung dan tentukan tanggal dan waktu pengingat dalam format ISO-8601 (yyyy-MM-ddTHH:mm:ss) berdasarkan waktu referensi saat ini ({currentTimeString}). Jika tidak ada waktu yang ditentukan, isi null.

Instruksi Format:
Kembalikan respon HANYA berupa JSON valid tanpa blok markdown (tanpa ```json ... ```) dan tanpa teks pembuka/penutup apapun.

Format JSON wajib:
{{
  ""title"": ""string"",
  ""description"": ""string"",
  ""category"": ""string"",
  ""isReminder"": false,
  ""remindAt"": null
}}";

        var rawResponse = await ExecuteGeminiApi(prompt, "ApiKeyVoiceActivity");
        var cleanJson = rawResponse.Replace("```json", "", StringComparison.OrdinalIgnoreCase)
                                   .Replace("```", "")
                                   .Trim();

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        try
        {
            var parsed = JsonSerializer.Deserialize<CreateActivityDto>(cleanJson, options);
            if (parsed == null || string.IsNullOrWhiteSpace(parsed.Title))
            {
                return new CreateActivityDto
                {
                    Title = speechText.Length > 50 ? speechText.Substring(0, 50) + "..." : speechText,
                    Description = speechText,
                    Category = "General",
                    IsReminder = false,
                    RemindAt = null
                };
            }

            // Normalisasi kategori
            var validCategories = new[] { "Productivity", "Learning", "Health", "Personal", "General" };
            var matchedCategory = validCategories.FirstOrDefault(c => c.Equals(parsed.Category, StringComparison.OrdinalIgnoreCase));
            parsed.Category = matchedCategory ?? "General";

            return parsed;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize Gemini output as CreateActivityDto: {RawJson}", cleanJson);
            return new CreateActivityDto
            {
                Title = speechText.Length > 50 ? speechText.Substring(0, 50) + "..." : speechText,
                Description = speechText,
                Category = "General",
                IsReminder = false,
                RemindAt = null
            };
        }
    }
}
