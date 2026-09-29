using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
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
                linkedCts.CancelAfter(TimeSpan.FromSeconds(120));

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
        var candidateModels = _configuration.GetSection("Gemini:CandidateModels")
            .Get<string[]>()
            ?? _configuration.GetSection("Gemini:CandidateModels")
                .GetChildren()
                .Select(c => c.Value)
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .ToArray();
        if (candidateModels == null || candidateModels.Length == 0)
        {
            candidateModels = new[]
            {
                "gemini-3.5-flash",
                "gemini-3.6-flash",
                "gemini-3.5-flash-lite",
                "gemini-flash-lite-latest"
            };
        }
        ;

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
                temperature = 0.1,
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
                linkedCts.CancelAfter(TimeSpan.FromSeconds(180));

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
    public async Task<List<CreateActivityDto>> ParseActivityFromSpeechAsync(string speechText, DateTime clientReferenceTime)
    {
        if (string.IsNullOrWhiteSpace(speechText))
        {
            throw new ArgumentException("Speech text cannot be empty.", nameof(speechText));
        }

        var currentTimeString = clientReferenceTime.ToString("yyyy-MM-dd HH:mm:ss");
        var dayOfWeek = clientReferenceTime.ToString("dddd", new System.Globalization.CultureInfo("id-ID"));

        var prompt = AIprompt.PromptParseActivityFromSpeechAsync(currentTimeString, dayOfWeek, speechText);

        var rawResponse = await ExecuteGeminiApi(prompt, "ApiKeyVoiceActivity");
        var cleanJson = rawResponse.Replace("```json", "", StringComparison.OrdinalIgnoreCase)
                                   .Replace("```", "")
                                   .Trim();

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var validCategories = new[] { "Productivity", "Learning", "Health", "Personal", "General" };

        try
        {
            List<CreateActivityDto>? parsedList = null;

            // Jika Gemini mengembalikan format JSON Array
            if (cleanJson.StartsWith("["))
            {
                parsedList = JsonSerializer.Deserialize<List<CreateActivityDto>>(cleanJson, options);
            }
            else
            {
                // Fallback jika Gemini secara insidental mengembalikan format objek tunggal
                var single = JsonSerializer.Deserialize<CreateActivityDto>(cleanJson, options);
                if (single != null)
                {
                    parsedList = new List<CreateActivityDto> { single };
                }
            }

            if (parsedList == null || parsedList.Count == 0)
            {
                return new List<CreateActivityDto>
                {
                    new CreateActivityDto
                    {
                        Title = speechText.Length > 50 ? speechText.Substring(0, 50) + "..." : speechText,
                        Description = speechText,
                        Category = "General",
                        IsReminder = true,
                        RemindAt = null
                    }
                };
            }

            // Normalisasi setiap item
            var results = new List<CreateActivityDto>();
            foreach (var item in parsedList)
            {
                if (string.IsNullOrWhiteSpace(item.Title)) continue;

                var matchedCategory = validCategories.FirstOrDefault(c => c.Equals(item.Category, StringComparison.OrdinalIgnoreCase));
                item.Category = matchedCategory ?? "General";
                item.IsReminder = true;
                results.Add(item);
            }

            if (results.Count == 0)
            {
                results.Add(new CreateActivityDto
                {
                    Title = speechText.Length > 50 ? speechText.Substring(0, 50) + "..." : speechText,
                    Description = speechText,
                    Category = "General",
                    IsReminder = true,
                    RemindAt = null
                });
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize Gemini output as List<CreateActivityDto>: {RawJson}", cleanJson);
            return new List<CreateActivityDto>
            {
                new CreateActivityDto
                {
                    Title = speechText.Length > 50 ? speechText.Substring(0, 50) + "..." : speechText,
                    Description = speechText,
                    Category = "General",
                    IsReminder = true,
                    RemindAt = null
                }
            };
        }
    }


    public async Task<string> ExecuteGeminiFunctionCallingAsync(
        string prompt,
        object? toolsDefinition = null,
        Func<string, JsonElement, Task<string>>? toolExecutor = null,
        string feature = "AIMemoryCompiler",
        bool forceJsonResponse = true,
        CancellationToken cancellationToken = default)
    {
        string? keyFeature = _configuration[$"Gemini:{feature}"] ?? _configuration["Gemini:ApiKeyAIMemoryCompiler"];
        if (string.IsNullOrWhiteSpace(keyFeature))
        {
            throw new InvalidOperationException($"Gemini API key for feature '{feature}' is not configured.");
        }

        var candidateModels = _configuration.GetSection("Gemini:CandidateModels").Get<string[]>();
        if (candidateModels == null || candidateModels.Length == 0)
        {
            candidateModels = new[]
            {
                "gemini-3.5-flash-lite",
                "gemini-flash-lite-latest",
                "gemini-3.5-flash",
                "gemini-3.6-flash"
            };
        }

        string lastErrorMessage = "Tidak ada model yang dapat dihubungi.";

        // --- CYCLE LOOP MODEL FALLBACK ---
        foreach (var modelName in candidateModels)
        {
            if (string.IsNullOrWhiteSpace(modelName)) continue;
            var cleanModel = modelName.Replace("models/", "").Trim();

            try
            {
                _logger.LogInformation("Memulai request ke Gemini dengan model: {Model}", cleanModel);

                // 1. RAKIT PAYLOAD AWAL (TURN 1)
                var contentsList = new List<object>
                {
                    new
                    {
                        role = "user",
                        parts = new object[] { new { text = prompt } }
                    }
                };
                var genConfig = new JsonObject
                {
                    ["temperature"] = 0.1
                };
                if (cleanModel.Contains("thinking", StringComparison.OrdinalIgnoreCase))
                {
                    genConfig["thinkingConfig"] = new JsonObject { ["thinkingBudget"] = 0 };
                }

                if (forceJsonResponse && toolsDefinition == null)
                {
                    genConfig["responseMimeType"] = "application/json";
                }

                var payloadObject = new JsonObject
                {
                    ["contents"] = JsonSerializer.SerializeToNode(contentsList),
                    ["generationConfig"] = genConfig
                };

                if (forceJsonResponse && toolsDefinition == null)
                {
                    payloadObject["generationConfig"]!["responseMimeType"] = "application/json";
                }

                if (toolsDefinition != null)
                {
                    payloadObject["tools"] = JsonSerializer.SerializeToNode(toolsDefinition);
                }

                // 2. HIT PERTAMA KE GEMINI
                var responseContent = await PostToGeminiWithRetryAsync(cleanModel, keyFeature, payloadObject.ToJsonString(), cancellationToken);
                using var document = JsonDocument.Parse(responseContent);
                var candidate = document.RootElement.GetProperty("candidates")[0];
                var parts = candidate.GetProperty("content").GetProperty("parts");

                // 3. DETEKSI APAKAH GEMINI MEMINTA FUNCTION CALL
                JsonElement? functionCallPart = null;
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("functionCall", out var fc))
                    {
                        functionCallPart = fc;
                        break;
                    }
                }

                // JIKA TIDAK ADA TOOL CALL -> Ambil teks langsung (Kasus Normal 80% Selesai di Sini)
                if (!functionCallPart.HasValue || toolExecutor == null)
                {
                    return ExtractTextFromParts(parts);
                }

                // 4. JIKA ADA TOOL CALL -> EKSEKUSI FUNGSI C# / SQL
                var fnName = functionCallPart.Value.GetProperty("name").GetString()!;
                var fnArgs = functionCallPart.Value.GetProperty("args");

                _logger.LogInformation("[Tool Call Detected] Menjalankan fungsi: {FnName}", fnName);
                string toolExecutionResult = await toolExecutor(fnName, fnArgs);
                var modelTurnContentNode = JsonNode.Parse(candidate.GetProperty("content").GetRawText());
                JsonNode? parsedToolResult;
                try
                {
                    parsedToolResult = JsonNode.Parse(toolExecutionResult);
                }
                catch
                {
                    parsedToolResult = JsonValue.Create(toolExecutionResult);
                }
                // 5. RAKIT PAYLOAD TURN 2 (Kirim hasil tool balik ke model yang sama)
                var turn2Contents = new JsonArray
                {
                    // History User
                    new { role = "user", parts = new object[] { new { text = prompt } } },
                    
                    // History Call dari Model
                    new JsonObject
                    {
                        ["role"] = "user",
                        ["parts"] = new JsonArray
                        {
                            new JsonObject { ["text"] = prompt }
                        }
                    },
                    modelTurnContentNode!,
                    // Respon dari Fungsi C#
                    new JsonObject
                    {
                        ["role"] = "user",
                        ["parts"] = new JsonArray
                        {
                            new JsonObject
                            {
                                ["functionResponse"] = new JsonObject
                                {
                                    ["name"] = fnName,
                                    ["response"] = new JsonObject
                                    {
                                        ["output"] = parsedToolResult
                                    }
                                }
                            }
                        }
                    }
                };
                var genConfigTurn2 = new JsonObject
                {
                    ["temperature"] = 0.1
                };

                if (cleanModel.Contains("thinking", StringComparison.OrdinalIgnoreCase))
                {
                    genConfigTurn2["thinkingConfig"] = new JsonObject { ["thinkingBudget"] = 0 };
                }

                if (forceJsonResponse)
                {
                    genConfigTurn2["responseMimeType"] = "application/json";
                }

                var payloadTurn2 = new JsonObject
                {
                    ["contents"] = turn2Contents, // <-- Sekarang menggunakan turn2Contents yang benar!
                    ["generationConfig"] = genConfigTurn2
                };

                if (forceJsonResponse)
                {
                    payloadTurn2["generationConfig"]!["responseMimeType"] = "application/json";
                }

                // 6. HIT KEDUA (Hanya terjadi jika tool terpanggil)
                var responseContentTurn2 = await PostToGeminiWithRetryAsync(cleanModel, keyFeature, payloadTurn2.ToJsonString(), cancellationToken);
                using var docTurn2 = JsonDocument.Parse(responseContentTurn2);
                var partsTurn2 = docTurn2.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts");

                return ExtractTextFromParts(partsTurn2);
            }
            catch (Exception ex)
            {
                lastErrorMessage = ex.Message;
                _logger.LogWarning("Model {Model} gagal diproses: {Msg}. Beralih ke kandidat berikutnya...", cleanModel, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
            }
        }

        throw new InvalidOperationException($"Seluruh kandidat model Gemini gagal. Error terakhir: {lastErrorMessage}");
    }

    private async Task<string> PostToGeminiWithRetryAsync(string cleanModel, string apiKey, string jsonPayload, CancellationToken cancellationToken)
    {
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{cleanModel}:generateContent?key={apiKey}";
        var safeUrlForLog = url.Replace(apiKey, "***REDACTED***");

        for (int attempt = 1; attempt <= 2; attempt++)
        {
            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            linkedCts.CancelAfter(TimeSpan.FromSeconds(15)); // Timeout diperketat agar tidak macet

            try
            {
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(url, content, linkedCts.Token);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _apiLogService.LogThirdParty("Gemini", safeUrlForLog, "POST", (int)response.StatusCode, $"Success with {cleanModel}", jsonPayload, responseBody, "AIGeminiService", "ExecuteGeminiUniversalAsync");
                    return responseBody;
                }

                if ((int)response.StatusCode != 429 && (int)response.StatusCode != 503)
                {
                    var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    throw new HttpRequestException($"Gemini API Error [{(int)response.StatusCode}]: {errorBody}");
                }

                await Task.Delay(TimeSpan.FromSeconds(2), linkedCts.Token);
            }
            catch (Exception ex) when (attempt < 2 && (ex is HttpRequestException || ex is OperationCanceledException))
            {
                _logger.LogWarning("Jaringan kendala ke {Model} percobaan {Attempt}: {Msg}", cleanModel, attempt, ex.Message);
                await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
            }
        }

        throw new TimeoutException($"Koneksi ke {cleanModel} timeout setelah 2 percobaan.");
    }

    private static string ExtractTextFromParts(JsonElement parts)
    {
        var sb = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var textElem))
            {
                sb.Append(textElem.GetString());
            }
        }
        return CleanMarkdownBlock(sb.ToString());
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
