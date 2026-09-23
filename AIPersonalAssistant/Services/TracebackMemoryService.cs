using System.Text.Encodings.Web;
using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs.TracebackMemory;
using AIPersonalAssistant.Models;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class TracebackMemoryService
{
    private readonly AppDbContext _dbContext;
    private readonly AIGeminiService _geminiClient;
    private readonly JsonSerializerOptions _jsonOptions;

    public TracebackMemoryService(AppDbContext dbContext, AIGeminiService geminiClient)
    {
        _dbContext = dbContext;
        _geminiClient = geminiClient;
        _jsonOptions = new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            PropertyNameCaseInsensitive = true
        };
    }

    public async Task<VoiceClientResultDto> ProcessTurnAsync(int userId, VoiceProcessRequestDto request)
    {
        // 1. Ambil atau inisialisasi sesi aktif
        var session = await _dbContext.TracebackMemories
            .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.UserId == userId && !s.IsCompleted);

        if (session == null)
        {
            session = new TracebackMemory
            {
                UserId = userId,
                CurrentTurn = 1,
                ConversationHistoryJson = "[]"
            };
            _dbContext.TracebackMemories.Add(session);
            await _dbContext.SaveChangesAsync();
        }

        // 2. Baca Memori Aktif (parse ValueJson agar tidak double-escaped)
        var rawMemories = await _dbContext.AIMemories
            .Where(m => m.UserId == userId && m.Status == "Active")
            .OrderByDescending(x => x.UpdatedAt)
            .Take(10)
            .ToListAsync();

        var activeMemories = rawMemories.Select(m => new
        {
            m.Key,
            m.Subject,
            m.MemoryType,
            Value = JsonDocument.Parse(m.ValueJson).RootElement
        });
        var activeMemoriesJson = JsonSerializer.Serialize(activeMemories, _jsonOptions);

        // 3. Baca Log Aktivitas Terbaru (Read-Only)
        var recentLogs = await _dbContext.ActivityLogs
            .Where(l => l.UserId == userId)
            .OrderByDescending(l => l.CreateAt)
            .Take(6)
            .Select(l => new { l.Title, l.Category, l.Status, l.CreateAt })
            .ToListAsync();
        var recentLogsJson = JsonSerializer.Serialize(recentLogs, _jsonOptions);

        // 4. Susun riwayat percakapan sesi ini
        var historyList = JsonSerializer.Deserialize<List<VoiceTurnItemDto>>(session.ConversationHistoryJson)
                          ?? new List<VoiceTurnItemDto>();
        var sessionHistoryText = string.Join("\n", historyList.Select(h => $"{h.Speaker}: {h.Message}"));

        // 5. Rakit Prompt via Static Builder
        string fullPrompt = AIprompt.TracebackMemoryandInsightPrompt(activeMemoriesJson, recentLogsJson, sessionHistoryText, request.UserSpeechInput);

        // 6. Request ke Gemini API
        var aiRawResponse = await _geminiClient.ExecuteGeminiJsonApi(fullPrompt, "ApiKeyAskAIAssistant");
        var aiResult = JsonSerializer.Deserialize<VoiceTurnResponseDto>(aiRawResponse, _jsonOptions)
                       ?? new VoiceTurnResponseDto { VoiceSpeechResponse = "Terjadi kendala memproses suara.", IsFinalTurn = true };

        // 7. Update Riwayat Percakapan
        historyList.Add(new VoiceTurnItemDto { Speaker = "User", Message = request.UserSpeechInput });
        historyList.Add(new VoiceTurnItemDto { Speaker = "Assistant", Message = aiResult.VoiceSpeechResponse });
        session.ConversationHistoryJson = JsonSerializer.Serialize(historyList, _jsonOptions);

        // 8. Evaluasi Batas Turn & Kunci Sesi
        bool isExhausted = session.CurrentTurn >= 4;
        bool isEnded = aiResult.IsFinalTurn || isExhausted || aiResult.ActionType == "CloseSession";

        // Finalisasi status sesi
        if (isEnded)
        {
            session.IsCompleted = true;
        }
        else
        {
            session.CurrentTurn++;
        }

        session.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        // 9. Kembalikan data untuk TTS frontend
        return new VoiceClientResultDto
        {
            SessionId = session.Id,
            CurrentTurn = session.CurrentTurn,
            TextToSpeak = aiResult.VoiceSpeechResponse,
            IsSessionEnded = isEnded,
            ProposedSchedules = aiResult.DraftSchedules
        };
    }
}
