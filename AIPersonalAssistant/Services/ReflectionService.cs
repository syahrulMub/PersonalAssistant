using System.Globalization;
using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs.AIReflectionActivity;
using AIPersonalAssistant.Models;
using Microsoft.AspNetCore.Builder.Extensions;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class ReflectionService
{
    private readonly AppDbContext _dbContext;
    private readonly AIGeminiService _aiService;
    private ILogger<ReflectionService> _logger;

    public ReflectionService(AppDbContext dbContext, AIGeminiService aiService, ILogger<ReflectionService> logger)
    {
        _dbContext = dbContext;
        _aiService = aiService;
        _logger = logger;
    }

    public async Task<ReflectionContextDto> GetReflectionContextAsync(int userId, string contextType = "Daily", CancellationToken ct = default)
    {
        var now = DateTime.Now;
        var lookbackDate = contextType.Equals("Weekly", StringComparison.OrdinalIgnoreCase)
            ? now.Date.AddDays(-7)
            : now.Date.AddDays(-1);
        var lookbackDateFormat = lookbackDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        // 1. Ambil memori jangka panjang aktif
        var activeMemories = await _dbContext.AIMemories
            .Where(m => m.UserId == userId && m.Status == "Active")
            .Select(m => new { m.MemoryType, m.Subject, m.Key, m.ValueJson })
            .ToListAsync(ct);
        var activeMemoriesJson = JsonSerializer.Serialize(activeMemories);

        // Batas akhir hari ini (Lokal) agar jadwal masa depan tidak ikut tertarik
        var endOfToday = now.Date.AddDays(1).AddTicks(-1);

        var todayStart = DateTime.Now.Date;

        // 1. Data Pencapaian (Hanya hari ini)
        var todaysWins = await _dbContext.ActivityLogs
            .Where(a => a.UserId == userId && a.Status == "Completed" && a.CompletedAt >= todayStart)
            .Select(a => new { a.Id, a.Title, a.CompletedAt })
            .ToListAsync(ct);

        // 2. Tugas Menggantung / Perlu Perhatian (Hari ini & yang terlewat)
        var pendingTasks = await _dbContext.ActivityLogs
            .Where(a => a.UserId == userId && (a.Status == "Pending" || a.Status == "Rescheduled") && a.ReminderTime <= endOfToday)
            .OrderByDescending(a => a.ReminderTime)
            .Select(a => new { a.Id, a.Title, a.ReminderTime, a.RescheduleCount })
            .ToListAsync(ct);

        var todaysWinsJson = JsonSerializer.Serialize(todaysWins);
        var pendingTasksJson = JsonSerializer.Serialize(pendingTasks);
        // 3. Susun prompt sintesis untuk AI
        var prompt = AIprompt.PromptGetReflectionContextAsync(contextType, activeMemoriesJson, todaysWinsJson, pendingTasksJson, DateTime.Now);
        //Console.WriteLine(prompt);
        // 4. Eksekusi model LLM
        var jsonResult = await _aiService.ExecuteGeminiJsonApi(prompt, "ApiKeyAIMemoryCompiler", ct);

        var compiledDto = JsonSerializer.Deserialize<ReflectionContextDto>(jsonResult, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? new ReflectionContextDto();

        compiledDto.ContextType = contextType;
        return compiledDto;
    }

    public async Task<ProcessReflectionResponseDto> ProcessReflectionTranscriptAsync(
        int userId,
        ReflectionContextDto request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Transcript))
        {
            throw new ArgumentException("Transkrip tidak boleh kosong.", nameof(request.Transcript));
        }

        // 1. Serialize seluruh context yang ditampilkan ke JSON untuk prompt AI
        string presentedContextJson = JsonSerializer.Serialize(new
        {
            request.ContextType,
            request.PeriodLabel,
            request.BriefDigest,
            request.ItemsToClarify,
            request.WinsAndCompletions,
            request.PersonalizedQuestion
        });

        var memoryUser = await _dbContext.AIMemories
                        .Where(m => m.UserId == userId && m.Status == "Active")
                        .Select(m => new
                        {
                            Id = m.Id,
                            Key = m.Key,
                            MemoryType = m.MemoryType,
                            Subject = m.Subject
                        }).ToListAsync();
        var memoryUserJson = JsonSerializer.Serialize(memoryUser);

        string prompt = AIprompt.BuildReflectionCompilerPrompt(request.Transcript, presentedContextJson, memoryUserJson, DateTime.Now);

        // 2. Panggil API AI
        string aiResponseJson = await _aiService.ExecuteGeminiJsonApi(prompt, "ApiKeyAIMemoryCompiler", ct);
        //Console.WriteLine(aiResponseJson);
        var parseOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var aiResult = JsonSerializer.Deserialize<AIReflectionOutputDto>(aiResponseJson, parseOptions)
            ?? throw new InvalidOperationException("Gagal membaca output JSON dari AI.");

        var appliedActivities = new List<string>();
        var appliedMemories = new List<string>();

        using var transaction = await _dbContext.Database.BeginTransactionAsync(ct);
        try
        {
            // 3. Simpan Entri Log Refleksi User
            var reflectionLog = new UserReflection
            {
                UserId = userId,
                ContextType = request.ContextType,
                CreatedAt = DateTime.Now,
                VoiceTranscript = request.Transcript,
                AIFeedback = aiResult.FeedbackText,
                ProcessedActionsJson = aiResponseJson
            };
            _dbContext.UserReflections.Add(reflectionLog);
            await _dbContext.SaveChangesAsync(ct);

            var touchedActivityIds = new List<int>();
            // 4. Eksekusi Perubahan ActivityLogs
            foreach (var actAction in aiResult.ActivityAdjustments)
            {
                if (actAction.ActionType == "MarkCompleted")
                {
                    ActivityLogs? activity = null;
                    if (actAction.TargetActivityId.HasValue && actAction.TargetActivityId.Value > 0)
                    {
                        activity = await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == actAction.TargetActivityId.Value && a.UserId == userId, ct);
                    }
                    else if (!string.IsNullOrWhiteSpace(actAction.TargetActivityTitle))
                    {
                        activity = await _dbContext.ActivityLogs
                            .Where(a => a.UserId == userId && a.Status != "Completed")
                            .FirstOrDefaultAsync(a => EF.Functions.Like(a.Title, $"%{actAction.TargetActivityTitle}%"), ct);
                    }

                    if (activity != null)
                    {
                        activity.Status = "Completed";
                        activity.CompletedAt = actAction.ActualCompletedDate ?? DateTime.Now;
                        activity.ResolutionSource = "VoiceReflection";
                        activity.Note = actAction.Note ?? activity.Note;
                        touchedActivityIds.Add(activity.Id);
                        appliedActivities.Add($"Selesai: '{activity.Title}'");
                    }
                }
                else if (actAction.ActionType == "Reschedule")
                {
                    var activity = actAction.TargetActivityId.HasValue
                        ? await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == actAction.TargetActivityId.Value && a.UserId == userId, ct)
                        : null;

                    if (activity != null)
                    {
                        activity.Status = "Rescheduled";
                        activity.IsReminder = true;
                        activity.OriginalReminderTime ??= activity.ReminderTime;
                        activity.ReminderTime = actAction.NewScheduledTime ?? activity.ReminderTime?.AddDays(1);
                        activity.RescheduleCount += 1;
                        activity.ResolutionSource = "VoiceReflection";
                        activity.Note = actAction.Note ?? activity.Note;
                        touchedActivityIds.Add(activity.Id);
                        appliedActivities.Add($"Jadwal Ulang: '{activity.Title}'");
                    }
                }
                else if (actAction.ActionType == "CreateNew" && !string.IsNullOrWhiteSpace(actAction.NewTaskTitle))
                {
                    var newActivity = new ActivityLogs
                    {
                        UserId = userId,
                        Title = actAction.NewTaskTitle,
                        Description = actAction.Note,
                        Category = string.IsNullOrWhiteSpace(actAction.NewTaskCategory) ? "General" : actAction.NewTaskCategory,
                        ReminderTime = actAction.NewScheduledTime,
                        IsReminder = actAction.NewScheduledTime.HasValue,
                        Status = actAction.NewStatus ?? "Pending",
                        ResolutionSource = "VoiceReflection",
                        CreateAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };
                    _dbContext.ActivityLogs.Add(newActivity);
                    await _dbContext.SaveChangesAsync(ct);
                    touchedActivityIds.Add(newActivity.Id);
                    appliedActivities.Add($"Aktivitas Baru: '{newActivity.Title}'");
                }
                else if (actAction.ActionType == "Cancel")
                {
                    var activity = actAction.TargetActivityId.HasValue
                        ? await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == actAction.TargetActivityId.Value && a.UserId == userId, ct)
                        : null;

                    if (activity != null)
                    {
                        activity.Status = "Cancelled";
                        activity.ResolutionSource = "VoiceReflection";
                        activity.Note = actAction.Note;
                        touchedActivityIds.Add(activity.Id);
                        appliedActivities.Add($"Dibatalkan: '{activity.Title}'");
                    }
                }
            }

            // 5. Update AiMemories & Kaitkan ke AiMemoryObservations
            foreach (var memUpdate in aiResult.MemoryUpdates)
            {
                AIMemory? memory = null;

                // LANGKAH 1: Utamakan pencarian via MemoryId (Mencegah Duplikasi)
                if (memUpdate.MemoryId > 0)
                {
                    memory = await _dbContext.AIMemories
                        .FirstOrDefaultAsync(m => m.Id == memUpdate.MemoryId && m.UserId == userId && m.Status == "Active", ct);
                }

                // LANGKAH 2: Fallback pencarian via Subject & Key jika AI tidak kirim MemoryId
                if (memory == null && !string.IsNullOrWhiteSpace(memUpdate.Subject) && !string.IsNullOrWhiteSpace(memUpdate.Key))
                {
                    memory = await _dbContext.AIMemories
                        .FirstOrDefaultAsync(m => m.UserId == userId && m.Subject == memUpdate.Subject && m.Key == memUpdate.Key && m.Status == "Active", ct);
                }

                // LANGKAH 3: Jika benar-benar entitas baru, barulah INSERT
                if (memory == null)
                {
                    memory = new AIMemory
                    {
                        UserId = userId,
                        Subject = memUpdate.Subject ?? "General",
                        Key = memUpdate.Key ?? "Note",
                        MemoryType = memUpdate.MemoryType ?? "State",
                        Confidence = Math.Clamp(memUpdate.Confidence > 0 ? memUpdate.Confidence : 0.8, 0.0, 1.0),
                        EvidenceCount = 1,
                        Status = "Active",
                        Source = "VoiceReflection",
                        FirstObservedAt = DateTime.Now,
                        LastObservedAt = DateTime.Now,
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };
                    _dbContext.AIMemories.Add(memory);
                }
                else
                {
                    // Update memori yang sudah ada
                    memory.Confidence = Math.Min(1.0, memory.Confidence + 0.1);
                    memory.EvidenceCount += 1;
                    memory.LastObservedAt = DateTime.Now;
                    memory.UpdatedAt = DateTime.Now;
                }

                // Perbarui isi data JSON memori
                memory.ValueJson = memUpdate.Value != null
                    ? (memUpdate.Value is string textVal ? textVal : JsonSerializer.Serialize(memUpdate.Value))
                    : "{}";

                // Simpan dulu agar memory.Id ter-generate jika ini entri baru
                await _dbContext.SaveChangesAsync(ct);

                // LANGKAH 4: Buat baris OBSERVASI (Bukti)
                // Tentukan apakah ada Activity spesifik yang valid dan baru saja selesai untuk memori ini
                int? validActivitySourceId = null;
                if (memUpdate.RelatedActivityId.HasValue)
                {
                    validActivitySourceId = memUpdate.RelatedActivityId.Value;
                }

                string obsText = memUpdate.Value != null
                    ? (memUpdate.Value is string t ? t : JsonSerializer.Serialize(memUpdate.Value))
                    : request.Transcript;

                if (validActivitySourceId.HasValue)
                {
                    // Sumber dari Aktivitas Selesai yang presisi
                    _dbContext.AIMemoryObservations.Add(new AIMemoryObservation
                    {
                        UserId = userId,
                        AIMemoryId = memory.Id,
                        SourceType = "Activity",
                        SourceId = validActivitySourceId.Value,
                        ObservationValue = obsText,
                        ObservedAt = DateTime.Now,
                        CreatedAt = DateTime.Now,
                        Weight = 1.0
                    });
                }
                else
                {
                    // Sumber murni pernyataan lisan dari Voice Reflection
                    _dbContext.AIMemoryObservations.Add(new AIMemoryObservation
                    {
                        UserId = userId,
                        AIMemoryId = memory.Id,
                        SourceType = "VoiceReflection",
                        SourceId = reflectionLog.Id,
                        ObservationValue = obsText,
                        ObservedAt = DateTime.Now,
                        CreatedAt = DateTime.Now,
                        Weight = 0.8
                    });
                }
            }

            await _dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            return new ProcessReflectionResponseDto
            {
                ReflectionId = reflectionLog.Id,
                FeedbackText = aiResult.FeedbackText,
                AppliedActivityChanges = appliedActivities,
                AppliedMemoryChanges = appliedMemories
            };
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(ct);
            _logger.LogError(ex, "Gagal memproses transaksi refleksi.");
            throw;
        }
    }
}
