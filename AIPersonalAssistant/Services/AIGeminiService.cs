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

    public async Task<string> ExecuteGeminiApi(string prompt, string feature, CancellationToken cancellationToken = default)
    {
        string? keyFeature = _configuration[$"Gemini:{feature}"] ?? _configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(keyFeature))
        {
            throw new InvalidOperationException($"Gemini API key for feature '{feature}' is not configured.");
        }

        // Ambil daftar model dari appsettings.json (dengan fallback default jika konfigurasi kosong)
        var candidateModels = _configuration.GetSection("Gemini:CandidateModels").Get<string[]>()
            ?? new[] { "gemini-3.5-flash", "gemini-3.5-flash-lite" };

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
        string lastErrorMessage = "Tidak ada model yang berhasil dieksekusi.";

        foreach (var modelName in candidateModels)
        {
            if (string.IsNullOrWhiteSpace(modelName)) continue;

            var cleanModel = modelName.Replace("models/", "").Trim();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{cleanModel}:generateContent?key={keyFeature}";
            var safeUrlForLog = url.Replace(keyFeature, "***REDACTED***");

            _logger.LogInformation("Mencoba eksekusi text dengan model: {Model}", cleanModel);
            _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", null, $"Req text model {cleanModel} started.", jsonPayload, null, "AIGeminiService", "ExecuteGeminiApi");

            HttpResponseMessage? response = null;

            // Retry maksimal 2x per model jika terjadi kendala sementara (429/503)
            for (int attempt = 1; attempt <= 2; attempt++)
            {
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                linkedCts.CancelAfter(TimeSpan.FromSeconds(30));

                try
                {
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    response = await _httpClient.PostAsync(url, content, linkedCts.Token);

                    if (response.IsSuccessStatusCode)
                    {
                        break;
                    }

                    // Jika error bukan rate-limit atau server overload (misal 400 Bad Request/404), stop retry model ini
                    if ((int)response.StatusCode != 429 && (int)response.StatusCode != 503)
                    {
                        break;
                    }

                    _logger.LogWarning("Model {Model} merespons {Status}. Menunggu 5 detik sebelum retry...", cleanModel, response.StatusCode);
                    await Task.Delay(TimeSpan.FromSeconds(5), linkedCts.Token);
                }
                catch (Exception ex) when (ex is HttpRequestException || ex is OperationCanceledException)
                {
                    _logger.LogWarning("Model {Model} timeout/gangguan jaringan: {Msg}", cleanModel, ex.Message);
                    if (attempt < 2)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(4), cancellationToken);
                    }
                }
            }

            // Jika berhasil: parse teks dan langsung return (membatalkan model berikutnya)
            if (response != null && response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, $"Success with {cleanModel}", jsonPayload, responseContent, "AIGeminiService", "ExecuteGeminiApi");

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
                    _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, "Gemini parsing failed.", jsonPayload, responseContent, "AIGeminiService", "ExecuteGeminiApi");
                    throw new InvalidOperationException("Failed to parse text response from Gemini API.", ex);
                }
            }

            // Catat error jika model gagal dan lanjut ke model berikutnya
            if (response != null)
            {
                lastErrorMessage = await response.Content.ReadAsStringAsync(cancellationToken);
                _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, $"Model {cleanModel} failed.", jsonPayload, lastErrorMessage, "AIGeminiService", "ExecuteGeminiApi");
            }

            _logger.LogWarning("Model {Model} gagal. Mencoba model berikutnya...", cleanModel);
            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        }

        throw new InvalidOperationException($"Semua kandidat model Gemini gagal dieksekusi. Error terakhir: {lastErrorMessage}");
    }

    public async Task<string> ExecuteGeminiJsonApi(string prompt, string feature = "AIMemoryCompiler", CancellationToken cancellationToken = default)
    {
        string? keyFeature = _configuration[$"Gemini:{feature}"] ?? _configuration["Gemini:ApiKeyAIMemoryCompiler"];
        if (string.IsNullOrWhiteSpace(keyFeature))
        {
            throw new InvalidOperationException($"Gemini API key for feature '{feature}' is not configured.");
        }

        var candidateModels = new[]
        {
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest"
    };

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
        },
            generationConfig = new
            {
                responseMimeType = "application/json",
                temperature = 0.1
            }
        };

        var jsonPayload = JsonSerializer.Serialize(payload);
        string lastErrorMessage = "Tidak ada model yang dapat dihubungi.";

        foreach (var modelName in candidateModels)
        {
            if (string.IsNullOrWhiteSpace(modelName)) continue;

            var cleanModel = modelName.Replace("models/", "").Trim();
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{cleanModel}:generateContent?key={keyFeature}";
            var safeUrlForLog = url.Replace(keyFeature, "***REDACTED***");

            _logger.LogInformation("Mencoba request AI Memory dengan model: {Model}", cleanModel);
            _apiLogService.LogThirdParty(provider: "Gemini", safeUrlForLog, "POST", null, $"Req model {cleanModel} started.", jsonPayload, null, "AIGeminiService", "ExecuteGeminiJsonApi");

            HttpResponseMessage? response = null;

            // Retry per model (maksimal 2 kali percobaan per model)
            for (int attempt = 1; attempt <= 2; attempt++)
            {
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                linkedCts.CancelAfter(TimeSpan.FromSeconds(45));

                try
                {
                    var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                    response = await _httpClient.PostAsync(url, content, linkedCts.Token);

                    // Jika sukses, langsung keluar dari loop retry
                    if (response.IsSuccessStatusCode)
                    {
                        break;
                    }

                    // Jika error selain 429 dan 503 (misal 404 Not Found), jangan retry model ini
                    if ((int)response.StatusCode != 429 && (int)response.StatusCode != 503)
                    {
                        break;
                    }

                    _logger.LogWarning("Model {Model} mengembalikan status {Status}. Menunggu jeda retry...", cleanModel, response.StatusCode);
                    await Task.Delay(TimeSpan.FromSeconds(5), linkedCts.Token);
                }
                catch (Exception ex) when (ex is HttpRequestException || ex is OperationCanceledException)
                {
                    _logger.LogWarning("Model {Model} kendala jaringan/timeout: {Msg}", cleanModel, ex.Message);
                    if (attempt < 2)
                    {
                        await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
                    }
                }
            }

            // JIKA SUKSES: Langsung parse dan RETURN (Otomatis membatalkan sisa model lain)
            if (response != null && response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, $"Success with {cleanModel}", jsonPayload, responseContent, "AIGeminiService", "ExecuteGeminiJsonApi");

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

                    return CleanMarkdownBlock(result.ToString());
                }
                catch (Exception ex)
                {
                    _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, "Gemini JSON parsing failed.", jsonPayload, responseContent, "AIGeminiService", "ExecuteGeminiJsonApi");
                    throw new InvalidOperationException("Failed to parse response from Gemini API.", ex);
                }
            }

            // JIKA GAGAL: Catat error dan biarkan loop berlanjut ke model berikutnya
            if (response != null)
            {
                lastErrorMessage = await response.Content.ReadAsStringAsync(cancellationToken);
                _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, $"Model {cleanModel} failed.", jsonPayload, lastErrorMessage, "AIGeminiService", "ExecuteGeminiJsonApi");
            }

            _logger.LogWarning("Model {Model} gagal. Mencoba model berikutnya...", cleanModel);
            await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
        }

        // Jika semua model dalam list telah dicoba dan seluruhnya gagal
        throw new InvalidOperationException($"Semua kandidat model Gemini gagal dieksekusi. Detail error terakhir: {lastErrorMessage}");
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
    private static string CleanMarkdownBlock(string rawText)
    {
        var text = rawText.Trim();
        if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
        {
            text = text.Substring(7);
        }
        else if (text.StartsWith("```"))
        {
            text = text.Substring(3);
        }

        if (text.EndsWith("```"))
        {
            text = text.Substring(0, text.Length - 3);
        }

        return text.Trim();
    }
}
