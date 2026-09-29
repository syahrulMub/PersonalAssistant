using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs.TracebackMemory;
using AIPersonalAssistant.Models;
using AIPersonalAssistant.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class TracebackMemoryService
{
    private readonly AppDbContext _dbContext;
    private readonly AIGeminiService _geminiClient;
    private readonly IAIMemoryService _memoryService;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly ILogger<TracebackMemoryService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public TracebackMemoryService(AppDbContext dbContext, AIGeminiService geminiClient, ILogger<TracebackMemoryService> logger, IAIMemoryService memoryService, IServiceScopeFactory scopeFactory)
    {
        _dbContext = dbContext;
        _geminiClient = geminiClient;
        _jsonOptions = new JsonSerializerOptions
        {
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
            PropertyNameCaseInsensitive = true
        };
        _logger = logger;
        _memoryService = memoryService;
        _scopeFactory = scopeFactory;
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

        // 2. Baca Memori Aktif (Top 10)
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

        // 3. Baca Log Aktivitas Terbaru (Ringkasan 6 Terakhir)
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

        // 5. Rakit Prompt
        string fullPrompt = AIprompt.TracebackMemoryandInsightPrompt(
            activeMemoriesJson,
            recentLogsJson,
            sessionHistoryText,
            request.UserSpeechInput
        );

        // 6. Siapkan Definisi Tools & Tool Executor (Pustaka Arsip)
        var toolsDefinition = GetLibraryToolsDefinition();

        Func<string, JsonElement, Task<string>> toolExecutor = async (fnName, args) =>
        {
            if (fnName == "search_comprehensive_history")
            {
                _logger.LogInformation("from gemini need to clear" + args);
                var keywords = new List<string>();

                if (args.TryGetProperty("keywords", out var kwElem) && kwElem.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in kwElem.EnumerateArray())
                    {
                        var str = item.GetString()?.Trim();
                        if (!string.IsNullOrWhiteSpace(str)) keywords.Add(str);
                    }
                }
                else if (args.TryGetProperty("query", out var qElem)) // Fallback jika model lama masih kirim "query"
                {
                    var raw = qElem.GetString() ?? "";
                    keywords = raw.Split(new[] { ' ', ',', '-' }, StringSplitOptions.RemoveEmptyEntries)
                                  .Where(w => w.Length > 2)
                                  .ToList();
                }

                string? domain = args.TryGetProperty("domain", out var dElem) ? dElem.GetString() : null;

                // Ambil maks 3 kata kunci terpenting
                var k1 = keywords.ElementAtOrDefault(0);
                var k2 = keywords.ElementAtOrDefault(1);
                var k3 = keywords.ElementAtOrDefault(2);

                // Query ke database arsip aktivitas pengguna
                var observantQuery = _dbContext.AIMemoryObservations
                    .AsNoTracking()
                    .Where(l => l.UserId == userId && l.SourceType == "Activity");

                if (keywords.Count > 0)
                {
                    observantQuery = observantQuery.Where(o =>
                        (k1 != null && (EF.Functions.Like(o.ObservationValue, $"%{k1}%") ||
                                        (o.AIMemory != null && (EF.Functions.Like(o.AIMemory.Key, $"%{k1}%") || EF.Functions.Like(o.AIMemory.Subject, $"%{k1}%"))))) ||
                        (k2 != null && (EF.Functions.Like(o.ObservationValue, $"%{k2}%") ||
                                        (o.AIMemory != null && (EF.Functions.Like(o.AIMemory.Key, $"%{k2}%") || EF.Functions.Like(o.AIMemory.Subject, $"%{k2}%"))))) ||
                        (k3 != null && (EF.Functions.Like(o.ObservationValue, $"%{k3}%") ||
                                        (o.AIMemory != null && (EF.Functions.Like(o.AIMemory.Key, $"%{k3}%") || EF.Functions.Like(o.AIMemory.Subject, $"%{k3}%")))))
                    );
                }
                var targetMemoryIds = await observantQuery
                        .Select(o => o.AIMemoryId)
                        .Distinct()
                        .Take(3)
                        .ToListAsync();
                if (targetMemoryIds.Count == 0 && keywords.Count > 0)
                {
                    targetMemoryIds = await _dbContext.AIMemories
                        .AsNoTracking()
                        .Where(m => m.UserId == userId && (
                            (k1 != null && (EF.Functions.Like(m.Key, $"%{k1}%") || EF.Functions.Like(m.Subject, $"%{k1}%"))) ||
                            (k2 != null && (EF.Functions.Like(m.Key, $"%{k2}%") || EF.Functions.Like(m.Subject, $"%{k2}%"))) ||
                            (k3 != null && (EF.Functions.Like(m.Key, $"%{k3}%") || EF.Functions.Like(m.Subject, $"%{k3}%")))
                        ))
                        .Select(m => m.Id)
                        .Take(3)
                        .ToListAsync();
                }
                var matchedMemories = await _dbContext.AIMemories
                        .AsNoTracking()
                        .Where(m => targetMemoryIds.Contains(m.Id))
                        .Select(m => new
                        {
                            m.Id,
                            m.Key,
                            m.Subject,
                            m.Status,
                            m.ValueJson
                        })
                        .ToListAsync();
                var relatedObservations = await _dbContext.AIMemoryObservations
                        .AsNoTracking()
                        .Where(o => o.UserId == userId && o.AIMemoryId != null && targetMemoryIds.Contains(o.AIMemoryId))
                        .OrderByDescending(o => o.CreatedAt)
                        .Take(20) // Batasi total observasi riwayat
                        .Select(o => new
                        {
                            MemoryId = o.AIMemoryId,
                            o.ObservationValue,
                            Date = o.CreatedAt.ToString("yyyy-MM-dd HH:mm")
                        })
                        .ToListAsync();


                var structuredResult = matchedMemories.Select(mem =>
                    {
                        // Parse ValueJson agar tersaji sebagai JSON Object asli di payload Gemini (bukan double-escaped string)
                        object? parsedValue;
                        try
                        {
                            parsedValue = !string.IsNullOrWhiteSpace(mem.ValueJson)
                                ? JsonNode.Parse(mem.ValueJson)
                                : null;
                        }
                        catch
                        {
                            parsedValue = mem.ValueJson;
                        }

                        return new
                        {
                            MemoryTopic = new
                            {
                                mem.Key,
                                mem.Subject,
                                mem.Status,
                                Value = parsedValue
                            },
                            ChronologicalObservations = relatedObservations
                                .Where(o => o.MemoryId == mem.Id)
                                .OrderBy(o => o.Date) // Urutkan maju agar AI membaca alur perkembangan
                                .Select(o => new
                                {
                                    o.Date,
                                    o.ObservationValue
                                })
                                .ToList()
                        };
                    }).ToList();
                var result = JsonSerializer.Serialize(structuredResult, _jsonOptions);
                return result;
            }

            return JsonSerializer.Serialize(new { error = $"Function {fnName} tidak didukung." });
        };
        var aiRawResponse = await _geminiClient.ExecuteGeminiFunctionCallingAsync(
        prompt: fullPrompt,
        toolsDefinition: toolsDefinition,
        toolExecutor: toolExecutor,
        feature: "ApiKeyAskAIAssistant",
        forceJsonResponse: true
        );
        var aiResult = JsonSerializer.Deserialize<VoiceTurnResponseDto>(aiRawResponse, _jsonOptions)
                       ?? new VoiceTurnResponseDto
                       {
                           VoiceSpeechResponse = "Terjadi kendala memproses data.",
                           ReportMarkdown = "",
                           IsFinalTurn = true
                       };

        // 8. Update Riwayat Percakapan (Simpan narasi audio ke history sesi)
        historyList.Add(new VoiceTurnItemDto { Speaker = "User", Message = request.UserSpeechInput });
        historyList.Add(new VoiceTurnItemDto { Speaker = "Assistant", Message = aiResult.VoiceSpeechResponse });
        session.ConversationHistoryJson = JsonSerializer.Serialize(historyList, _jsonOptions);

        // 9. Evaluasi Batas Turn & Status Sesi
        bool isExhausted = session.CurrentTurn >= 7;
        bool isEnded = aiResult.IsFinalTurn || isExhausted || aiResult.ActionType == "CloseSession";

        if (isEnded)
        {
            session.IsCompleted = true;
        }
        else
        {
            session.CurrentTurn++;
        }

        //update memory logic
        if (aiResult.MemoryMutations.Count > 0)
        {
            _logger.LogInformation("[TracebackMemoryService] Menemukan {Count} memory mutations, memicu CorrectionMemoryAskAI di latar belakang", aiResult.MemoryMutations.Count);

            // Trigger AI Memory Reconciler di latar belakang (Non-blocking)
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var scopedMemoryService = scope.ServiceProvider.GetRequiredService<IAIMemoryService>();
                    await scopedMemoryService.CorrectionMemoryAskAI(userId, aiResult.MemoryMutations);
                }
                catch (Exception bgEx)
                {
                    _logger.LogError(bgEx, "[TracebackMemoryService] Error background CorrectionMemoryAskAI untuk User ID {UserId}", userId);
                }
            });
        }
        else
        {
            _logger.LogInformation("[TracebackMemoryService] Tidak ada memory mutations dari respons AI turn ini.");
        }


        session.UpdatedAt = DateTime.Now;
        await _dbContext.SaveChangesAsync();

        // 10. Kembalikan Response Ganda (Audio TTS + Visual Markdown) dan Usulan Memory Mutation
        return new VoiceClientResultDto
        {
            SessionId = session.Id,
            CurrentTurn = session.CurrentTurn,
            TextToSpeak = aiResult.VoiceSpeechResponse,
            ReportMarkdown = aiResult.ReportMarkdown,
            IsSessionEnded = isEnded,
            ProposedSchedules = aiResult.DraftSchedules,
            MemoryMutations = aiResult.MemoryMutations ?? new()
        };
    }

    public static object GetLibraryToolsDefinition()
    {
        return new object[]
        {
        new
        {
            functionDeclarations = new object[]
            {
                new
                {
                    name = "search_comprehensive_history",
                    description = "Mencari arsip menyeluruh di database perpustakaan aktivitas, catatan proyek, log historis lama, atau detail topik lampau yang tidak ada di memori aktif.",
                    parameters = new
                    {
                        type = "OBJECT",
                        properties = new
                        {
                            keywords = new
                            {
                                type = "ARRAY",
                                description = "Daftar 1 sampai 3 kata kunci pencarian mandiri (contoh: [\"Personal Assistant\", \"Traceback\"]). DILARANG mengirim kalimat panjang.",
                                items = new { type = "STRING" }
                            },
                            domain = new
                            {
                                type = "STRING",
                                description = "Kategori domain jika spesifik: 'Project', 'Learning', 'Health', 'Personal', atau biarkan kosong untuk semua."
                            },
                            timeRangeHint = new
                            {
                                type = "STRING",
                                description = "Rentang waktu perkiraan: 'last_month', 'last_year', 'all_time'"
                            }
                        },
                        required = new[] { "keywords" }
                    }
                }
            }
        }
        };
    }
}
