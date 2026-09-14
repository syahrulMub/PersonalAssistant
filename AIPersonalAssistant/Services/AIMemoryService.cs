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
        var thisDay = DateTime.UtcNow.Date;
        var activities = await _dbContext.ActivityLogs
            .Where(a => a.UserId == userId && a.CreateAt >= thisDay.AddDays(-1) && a.CreateAt <= thisDay)
            .Select(a => new { a.Id, a.Title, a.Description, a.CreateAt })
            .ToListAsync();
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

        if (!activities.Any())
        {
            _logger.LogInformation("Tidak ada aktivitas untuk diproses pada User {UserId}", userId);
            return;
        }

        var activitiesJson = JsonSerializer.Serialize(activities);
        var extractionPrompt = BuildExtractionPrompt(activitiesJson, topicsCatalogText);

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
        var consolidationPrompt = BuildConsolidationPrompt(candidatesJson, existingMemoriesJson);
        var decisionResultJson = await _aiClient.ExecuteGeminiJsonApi(consolidationPrompt);

        var decisions = JsonSerializer.Deserialize<List<MemoryDecisionDto>>(
            decisionResultJson,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (decisions == null || !decisions.Any()) return;
        await PersistMemoryDecisionsAsync(userId, decisions);

    }
    private async Task PersistMemoryDecisionsAsync(int userId, List<MemoryDecisionDto> decisions, CancellationToken cancellationToken = default)
    {
        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var now = DateTime.UtcNow;

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
    private string BuildExtractionPrompt(string rawActivitiesJson, string existingTopicsCatalog) =>
        $@"Anda adalah AI Memory Extraction Engine. Tugas Anda mengekstrak wawasan bernilai jangka panjang dari log aktivitas pengguna ke dalam struktur data memori yang kohesif.

[DAFTAR TOPIK / MEMORI YANG SUDAH AKTIF]
{existingTopicsCatalog}

PRINSIP EVALUASI NILAI MEMORI:
Ekstrak menjadi entitas memori jika aktivitas memenuhi salah satu kriteria nilai berikut:
1. **Siklus Periodik & Mitigasi Risiko (Periodic Cycles & Preservation)**:
   - Tindakan berkala yang memiliki interval waktu berulang dan berisiko menimbulkan dampak negatif jika terlupakan (pemeliharaan kondisi, siklus kepatuhan, atau peninjauan preventif).
2. **Kondisi & Profil Berkelanjutan (Sustained State & Context)**:
   - Informasi mengenai peran primer, transisi fase hidup, atau status fungsional yang memengaruhi lanskap keseharian pengguna.
3. **Inisiatif & Milestone Bertahap (Progressive Initiatives)**:
   - Upaya yang membutuhkan rangkaian proses bertingkat dan waktu berkelanjutan untuk mencapai target tertentu.
4. **Rutinitas & Kesejahteraan Berulang (Behavioral Routines & Wellness)**:
   - Pola aktivitas fisik, mental, atau kebiasaan terstruktur yang mencerminkan keterlibatan berkala.
5. **Preferensi & Batasan Operasional (Preferences & Constraints)**:
   - Kecenderungan pilihan instrumen, metodologi kerja, atau batasan personal yang konsisten.

PENGECUALIAN / ABAIKAN (TRANSIENT NOISE):
- Abaikan transaksi atau interaksi kasual sekali lewat yang tidak membawa dampak risiko jangka panjang jika dilupakan, serta tidak memiliki keterkaitan dengan inisiatif, status, atau kebiasaan terstruktur.

ATURAN STATUS & DERAJAT KEYAKINAN (CONFIDENCE):
- **Aktivitas Faktual (Telah Terjadi)**: Berikan confidence tinggi (0.8 - 1.0) dan tentukan status operasional 'Completed' atau 'Ongoing'.
- **Rencana / Pengingat / Komitmen Masa Depan**: Berikan confidence terukur (0.6 - 0.75), tentukan status operasional 'Planned' atau 'Scheduled', dan catat target proyeksi waktunya.
- **Konsistensi Topik**: Jika aktivitas relevan dengan daftar topik aktif di atas, WAJIB gunakan Subject dan Key yang sama persis untuk mencegah fragmentasi data.

FORMAT OUTPUT:
Wajib memberikan output HANYA format JSON valid tanpa blok markdown atau teks tambahan:
{{
  ""memories"": [
    {{
      ""memoryType"": ""Cyclic"" | ""State"" | ""Project"" | ""Routine"" | ""Preference"",
      ""subject"": ""string (Domain/Area Utama)"",
      ""key"": ""string (Kunci Topik Spesifik)"",
      ""value"": {{
         ""currentStatus"": ""Completed"" | ""Ongoing"" | ""Planned"" | ""Scheduled"",
         ""details"": ""string ringkasan fakta/progres"",
         ""lastExecutedAt"": ""YYYY-MM-DD (jika faktual telah terjadi)"",
         ""nextProjectedAt"": ""YYYY-MM-DD (jika terdapat rencana/estimasi jadwal berikutnya)"",
         ""cycleInterval"": ""string estimasi ritme jika relevan (misal: harian, mingguan, bulanan, kuartalan)""
      }},
      ""source"": ""InferredFromActivity"",
      ""confidence"": 0.0,
      ""evidence"": [
        {{
          ""sourceId"": 0,
          ""sourceType"": ""Activity"",
          ""observationValue"": ""string isi log aktivitas asli""
        }}
      ]
    }}
  ]
}}

[LOG AKTIVITAS PENGGUNA]
{rawActivitiesJson}";

    private static string BuildConsolidationPrompt(string candidatesJson, string existingMemoriesJson) =>
        $@"Anda adalah AI Memory Consolidation Engine. Tugas Anda mengevaluasi kandidat memori baru terhadap memori lama pengguna untuk mencegah fragmentasi dan duplikasi data.

            ATURAN PENGAMBILAN KEPUTUSAN (ACTION):
            1. CREATE:
            - Gunakan jika kandidat benar-benar topik baru dan TIDAK memiliki kaitan dengan memori lama.
            - Set ""existingMemoryId"": null, ""sourceMemoryId"": null.

            2. UPDATE:
            - Gunakan jika kandidat merupakan kelanjutan, perkembangan progres, atau informasi tambahan dari memori lama yang sudah ada.
            - Set ""existingMemoryId"" ke ID memori lama.
            - Gabungkan data lama dan data baru di dalam ""valueJson"" (jangan hapus data lama yang masih valid, sintesiskan).
            - Naikkan nilai ""confidence"" (maksimal 1.0) karena bukti observasi bertambah.

            3. MERGE:
            - Gunakan jika kandidat menyadarkan bahwa ada memori lama A (sub-fitur/topik parsial) yang sebenarnya adalah bagian dari memori lama B (proyek utama).
            - Set ""existingMemoryId"" ke ID memori target utama (B).
            - Set ""sourceMemoryId"" ke ID memori lama yang akan dilebur/diarsipkan (A).
            - Gabungkan seluruh konten ke dalam ""valueJson"" memori utama.

            4. IGNORE:
            - Gunakan jika informasi pada kandidat sudah tercatat lengkap di memori lama tanpa ada hal baru yang bernilai.

            FORMAT OUTPUT:
            Wajib memberikan output HANYA array JSON valid tanpa markdown, pembuka, atau penutup:
            [
            {{
                ""action"": ""CREATE"" | ""UPDATE"" | ""IGNORE"" | ""MERGE"",
                ""existingMemoryId"": 0,
                ""sourceMemoryId"": null,
                ""memoryType"": ""string"",
                ""subject"": ""string"",
                ""key"": ""string"",
                ""valueJson"": ""string (JSON valid yang sudah di-serialize/escaped)"",
                ""confidence"": 0.0,
                ""reason"": ""string ringkas alasan keputusan"",
                ""evidence"": [
                {{
                    ""sourceId"": 0,
                    ""sourceType"": ""Activity"",
                    ""observationValue"": ""string""
                }}
                ]
            }}
            ]

            [DAFTAR MEMORI LAMA YANG RELEVAN]
            {existingMemoriesJson}

            [KANDIDAT MEMORI BARU DARI AKTIVITAS HARI INI]
            {candidatesJson}";
}
