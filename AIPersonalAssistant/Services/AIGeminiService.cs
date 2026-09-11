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

    public async Task<string> ExecuteGeminiApi(string prompt)
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
}
