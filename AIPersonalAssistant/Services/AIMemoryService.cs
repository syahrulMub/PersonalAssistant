using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs.AIMemoryBackserviceDto;
using AIPersonalAssistant.Models;
using AIPersonalAssistant.Services.Interface;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class AIMemoryService : IAIMemoryService
{
    private readonly AppDbContext _dbContext;
    private readonly AIGeminiService _aiClient;
    private readonly ILogger<AIMemoryService> _logger;

    public AIMemoryService(AppDbContext dbContext, AIGeminiService aiClient, ILogger<AIMemoryService> logger)
    {
        _dbContext = dbContext;
        _aiClient = aiClient;
        _logger = logger;
    }
    public async Task ProcessDailyMemoriesAsync(int userId)
    {
        var lookback = DateTime.Now.AddDays(-1);
        var activitiesToProcess = await _dbContext.ActivityLogs
            .Where(a => a.UserId == userId &&
                (
                    // Belum pernah disinkronkan ATAU diubah setelah terakhir disinkronkan
                    a.MemorySyncedAt == null ||
                    (a.UpdatedAt > a.MemorySyncedAt)
                )
            )
            .OrderBy(a => a.CreateAt)
            .Take(50)
            .Select(a => new { a.Id, a.Title, a.Description, a.Status, a.CreateAt, a.UpdatedAt, a.MemorySyncedAt })
            .ToListAsync();

        if (!activitiesToProcess.Any())
        {
            _logger.LogInformation("Tidak ada aktivitas untuk diproses pada User {UserId}", userId);
            return;
        }
        var existingTopics = await _dbContext.AIMemories
                        .Where(m => m.UserId == userId && m.Status == "Active").Select(m => new
                        {
                            m.Id,
                            m.MemoryType,
                            m.Subject,
                            m.Key
                        })
                        .ToListAsync();

        // 2. Format menjadi teks ringkas per baris
        var topicsCatalogText = existingTopics.Any()
            ? string.Join("\n", existingTopics.Select(t => $"- ID: {t.Id} | Type: {t.MemoryType} | Subject: {t.Subject} | Key: {t.Key}"))
            : "(Belum ada memori yang tercatat)";



        var activitiesJson = JsonSerializer.Serialize(activitiesToProcess);
        var extractionPrompt = AIprompt.BuildExtractionPrompt(activitiesJson, topicsCatalogText);

        var extractionResultJson = await _aiClient.ExecuteGeminiJsonApi(extractionPrompt);

        var extractionResponse = JsonSerializer.Deserialize<MemoryExtractionResponse>(
            extractionResultJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (extractionResponse?.Memories == null || !extractionResponse.Memories.Any())
        {
            _logger.LogInformation("Tidak ada kandidat memori yang diekstrak.");
            return;
        }

        var candidateKeys = extractionResponse.Memories.Select(m => m.Key.ToLower()).Distinct().ToList();
        var candidateSubjects = extractionResponse.Memories.Select(m => m.Subject.ToLower()).Distinct().ToList();

        var relevantMemories = await _dbContext.AIMemories
            .Where(m => m.UserId == userId && m.Status == "Active" &&
                       (candidateKeys.Contains(m.Key.ToLower()) || candidateSubjects.Contains(m.Subject.ToLower())))
            .Select(m => new
            {
                m.Id,
                m.MemoryType,
                m.Subject,
                m.Key,
                m.ValueJson,
                m.Confidence,
                m.EvidenceCount,
                m.LastObservedAt
            })
            .ToListAsync();

        var candidatesJson = JsonSerializer.Serialize(extractionResponse.Memories);
        var existingMemoriesJson = JsonSerializer.Serialize(relevantMemories);
        var consolidationPrompt = AIprompt.BuildConsolidationPrompt(candidatesJson, existingMemoriesJson);
        var decisionResultJson = await _aiClient.ExecuteGeminiJsonApi(consolidationPrompt);

        var decisions = JsonSerializer.Deserialize<List<MemoryDecisionDto>>(
            decisionResultJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (decisions == null || !decisions.Any()) return;
        await PersistMemoryDecisionsAsync(userId, decisions);
        var processedIds = activitiesToProcess.Select(a => a.Id).ToList();

        if (processedIds.Count > 0)
        {
            var syncTime = DateTime.Now;

            await _dbContext.ActivityLogs
                .Where(a => processedIds.Contains(a.Id))
                .ExecuteUpdateAsync(setter => setter.SetProperty(a => a.MemorySyncedAt, syncTime));
        }
        await _dbContext.SaveChangesAsync();

    }
    private async Task PersistMemoryDecisionsAsync(int userId, List<MemoryDecisionDto> decisions, CancellationToken cancellationToken = default)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var now = DateTime.Now;

            foreach (var item in decisions)
            {
                // 1. IGNORE: Lewati tanpa perubahan
                if (string.Equals(item.Action, "IGNORE", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                // 2. CREATE: Buat entitas memori baru
                if (string.Equals(item.Action, "CREATE", StringComparison.OrdinalIgnoreCase))
                {
                    var newMemory = new AIMemory
                    {
                        UserId = userId,
                        MemoryType = item.MemoryType,
                        Subject = item.Subject,
                        Key = item.Key,
                        ValueJson = item.ValueJson,
                        Confidence = Math.Clamp(item.Confidence, 0.0, 1.0),
                        EvidenceCount = item.Evidence.Count,
                        Status = "Active",
                        Source = "InferredFromActivity",
                        FirstObservedAt = now,
                        LastObservedAt = now,
                        CreatedAt = now,
                        UpdatedAt = now
                    };

                    AddEvidenceObservations(newMemory.Observations, item.Evidence, userId, now);
                    _dbContext.AIMemories.Add(newMemory);
                }
                // 3. UPDATE: Perbarui memori yang sudah ada
                else if (string.Equals(item.Action, "UPDATE", StringComparison.OrdinalIgnoreCase) && item.ExistingMemoryId.HasValue)
                {
                    var memoryToUpdate = await _dbContext.AIMemories
                        .Include(m => m.Observations)
                        .FirstOrDefaultAsync(m => m.Id == item.ExistingMemoryId.Value && m.UserId == userId, cancellationToken);

                    if (memoryToUpdate != null)
                    {
                        memoryToUpdate.ValueJson = item.ValueJson;
                        memoryToUpdate.Confidence = Math.Clamp(item.Confidence, 0.0, 1.0);
                        memoryToUpdate.EvidenceCount += item.Evidence.Count;
                        memoryToUpdate.LastObservedAt = now;
                        memoryToUpdate.UpdatedAt = now;

                        AddEvidenceObservations(memoryToUpdate.Observations, item.Evidence, userId, now);
                    }
                }
                // 4. MERGE: Gabungkan memori parsial/sub-fitur ke memori utama
                else if (string.Equals(item.Action, "MERGE", StringComparison.OrdinalIgnoreCase) && item.ExistingMemoryId.HasValue)
                {
                    var targetMemory = await _dbContext.AIMemories
                        .Include(m => m.Observations)
                        .FirstOrDefaultAsync(m => m.Id == item.ExistingMemoryId.Value && m.UserId == userId, cancellationToken);

                    if (targetMemory != null)
                    {
                        // A. Update target memori utama dengan nilai gabungan baru
                        targetMemory.ValueJson = item.ValueJson;
                        targetMemory.Confidence = Math.Clamp(item.Confidence, 0.0, 1.0);
                        targetMemory.LastObservedAt = now;
                        targetMemory.UpdatedAt = now;

                        // B. Jika ada SourceMemoryId yang dilebur, transfer bukti observasinya & nonaktifkan
                        if (item.SourceMemoryId.HasValue && item.SourceMemoryId.Value != targetMemory.Id)
                        {
                            var sourceMemory = await _dbContext.AIMemories
                                .Include(m => m.Observations)
                                .FirstOrDefaultAsync(m => m.Id == item.SourceMemoryId.Value && m.UserId == userId, cancellationToken);

                            if (sourceMemory != null)
                            {
                                // Pindahkan semua riwayat observasi dari memori sumber ke target
                                foreach (var obs in sourceMemory.Observations.ToList())
                                {
                                    obs.AIMemoryId = targetMemory.Id;
                                }

                                // Tandai memori sumber sebagai 'Merged' agar tidak aktif lagi
                                sourceMemory.Status = "Merged";
                                sourceMemory.UpdatedAt = now;

                                targetMemory.EvidenceCount += sourceMemory.EvidenceCount;
                            }
                        }

                        // C. Tambahkan bukti observasi baru dari aktivitas hari ini
                        AddEvidenceObservations(targetMemory.Observations, item.Evidence, userId, now);
                        targetMemory.EvidenceCount += item.Evidence.Count;
                    }
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            _logger.LogInformation("Berhasil menyimpan keputusan AI Memory untuk User {UserId}", userId);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            _logger.LogError(ex, "Rollback: Gagal menyimpan data AI Memory ke SQLite untuk User {UserId}", userId);
            throw;
        }
    }

    private static void AddEvidenceObservations(ICollection<AIMemoryObservation> targetCollection, List<MemoryEvidenceDto> evidences, int userId, DateTime now)
    {
        foreach (var ev in evidences)
        {
            targetCollection.Add(new AIMemoryObservation
            {
                UserId = userId,
                SourceType = ev.SourceType,
                SourceId = ev.SourceId,
                ObservationValue = ev.ObservationValue,
                Weight = 1.0,
                ObservedAt = now,
                CreatedAt = now
            });
        }
    }
}
