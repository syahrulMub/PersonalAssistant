using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.EmailServices;
using AIPersonalAssistant.Models;
using AIPersonalAssistant.Services.Interface;
using Microsoft.EntityFrameworkCore;
using Org.BouncyCastle.Crypto.Prng;

namespace AIPersonalAssistant.Services;


public class SchedulerMethod
{
    private readonly ILogger<SchedulerMethod> _logger;
    private readonly IEmailSevice _emailService;
    private readonly AIGeminiService _aiService;
    private readonly AppDbContext _dbContext;
    private readonly AiRecapService _aiRecapService;
    private readonly IAIMemoryService _aiMemoryService;

    public SchedulerMethod(ILogger<SchedulerMethod> logger, IEmailSevice emailService, AIGeminiService aiService, AppDbContext dbContext, AiRecapService aiRecapService, IAIMemoryService aIMemoryService)
    {
        _logger = logger;
        _emailService = emailService;
        _aiService = aiService;
        _dbContext = dbContext;
        _aiRecapService = aiRecapService;
        _aiMemoryService = aIMemoryService;
    }

    public async Task GenerateNightSummaryAsync()
    {
        var targetDate = DateTime.Now.Date;
        var startOfToday = targetDate;
        var endOfToday = startOfToday.AddDays(1).AddTicks(-1);
        var threeDaysAgo = startOfToday.AddDays(-2); // Jendela 3 hari (kemarin lusa s/d hari ini)

        var listUser = await _dbContext.Users.ToListAsync();

        foreach (var user in listUser)
        {
            var isFeatureEnabled = await _dbContext.UserAIFeatures
                .AnyAsync(uf => uf.UserId == user.Id && uf.FeatureId == 3 && uf.IsEnabled);

            if (!isFeatureEnabled) continue;

            // 1. Ambil memori aktif dalam rentang 3 hari terakhir
            var recentMemories = await _dbContext.AIMemories
                .Where(m => m.UserId == user.Id
                         && m.Status == "Active"
                         && m.LastObservedAt >= threeDaysAgo)
                .OrderByDescending(m => m.LastObservedAt)
                .ToListAsync();

            // Pisahkan memori yang disentuh hari ini vs konteks hari sebelumnya
            var memoriesToday = recentMemories
                .Where(m => m.LastObservedAt >= startOfToday && m.LastObservedAt <= endOfToday)
                .ToList();

            var previousMemories = recentMemories
                .Where(m => m.LastObservedAt < startOfToday)
                .ToList();

            var todayText = memoriesToday.Any()
                ? string.Join("\n", memoriesToday.Select(m => $"- [{m.MemoryType}] {m.Subject} ({m.Key}): {m.ValueJson}"))
                : "(Tidak ada aktivitas baru yang dicatat hari ini / Hari Istirahat)";

            var contextText = previousMemories.Any()
                ? string.Join("\n", previousMemories.Select(m => $"- [{m.MemoryType}] {m.Subject}: {m.ValueJson}"))
                : "(Tidak ada konteks proyek sebelumnya)";

            // 2. Prompt adaptif
            string prompt = $@"
Kamu adalah asisten pribadi pintar, empatik, dan suportif.
Tugasmu adalah memberikan refleksi penutup hari untuk pengguna berdasarkan data memori berikut.

[AKTIVITAS & PROGRES HARI INI]
{todayText}

[KONTEKS PROYEK/KEBIASAAN BEBERAPA HARI TERAKHIR]
{contextText}

PEDOMAN NADA & EVALUASI:
1. JIKA ADA AKTIVITAS HARI INI: Fokus apresiasi dan evaluasi pencapaian hari ini, kaitkan dengan progres proyek berjalan.
2. JIKA HARI INI KOSONG (REST DAY): Validasi hari ini sebagai hari istirahat/pemulihan energi yang wajar. Hubungkan dengan beban kerja dari konteks proyek beberapa hari terakhir agar pengguna merasa tenang dan tidak terbebani pikiran.

FORMAT OUTPUT (Wajib JSON valid murni tanpa markdown):
{{
  ""summaryText"": ""Ulasan reflektif mengenai hari ini (atau apresiasi atas jeda istirahat yang diambil)."",
  ""positiveAffirmations"": ""Apresiasi tulus, penenang pikiran, dan validasi agar pengguna siap beristirahat dengan damai."",
  ""actionableInsights"": ""1 catatan santai untuk mempersiapkan ritme esok hari.""
}}";

            try
            {
                var cleanJson = await _aiService.ExecuteGeminiJsonApi(prompt, "ApiKeyRecapDaily");

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<DailySummaryAiDto>(cleanJson, options);

                if (result == null) continue;

                await _aiRecapService.SaveRecapAsync(result);

                string subject = memoriesToday.Any()
                    ? "Refleksi & Rekap Malam AI Assistant"
                    : "Pesan Penutup Hari & Istirahat - AI Assistant";

                string body = BuildNightSummaryHtml(result.SummaryText, result.PositiveAffirmations, result.ActionableInsights);
                await _emailService.SendEmailAsync(subject, body, user.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gagal memproses Night Summary untuk User {UserId}", user.Id);
            }
        }
    }
    public async Task GenerateMorningSummaryAsync()
    {
        var today = DateTime.Now.Date;
        var tomorrow = today.AddDays(1);
        var aDayAgo = today.AddDays(-1);

        var listUser = await _dbContext.Users.ToListAsync();
        foreach (var user in listUser)
        {
            var isFeatureEnabled = await _dbContext.UserAIFeatures
                .AnyAsync(uf => uf.UserId == user.Id && uf.FeatureId == 2 && uf.IsEnabled);

            if (!isFeatureEnabled)
            {
                continue;
            }

            // 1. Agenda Hari Ini (Aktivitas aktif: Pending, Reschedule, InProgress)
            var todayLogs = await _dbContext.ActivityLogs
                .Where(x => x.UserId == user.Id)
                .Where(x => x.Status != "Completed" && x.Status != "Cancelled")
                .Where(a =>
                    (a.ReminderTime >= today && a.ReminderTime < tomorrow)
                    || (a.CreateAt >= today && a.CreateAt < tomorrow)
                    || (a.UpdatedAt >= today && a.UpdatedAt < tomorrow)
                )
                .OrderBy(a => a.ReminderTime)
                .ToListAsync();

            var todayActivitiesText = todayLogs.Any()
                ? string.Join("\n", todayLogs.Select(l => $"- Title: {l.Title}, Kategori: {l.Category}, Status: {l.Status}{(string.IsNullOrWhiteSpace(l.Description) ? "" : $", Deskripsi: {l.Description}")}"))
                : "(Tidak ada agenda kegiatan spesifik yang dicatat untuk hari ini)";

            // 2. Kegiatan & Progres Kemarin (Termasuk yang selesai atau dikerjakan kemarin)
            var yesterdayLogs = await _dbContext.ActivityLogs
                .Where(x => x.UserId == user.Id)
                .Where(a =>
                    (a.CompletedAt >= aDayAgo && a.CompletedAt < today)
                    || (a.UpdatedAt >= aDayAgo && a.UpdatedAt < today)
                    || (a.CreateAt >= aDayAgo && a.CreateAt < today)
                )
                .OrderByDescending(a => a.CompletedAt ?? a.UpdatedAt)
                .Take(8)
                .ToListAsync();
            var jsonOptions = new JsonSerializerOptions
            {
                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                WriteIndented = false
            };

            var yesterdayActivitiesText = yesterdayLogs.Any()
                ? string.Join("\n", yesterdayLogs.Select(l => $"- Title: {l.Title}, Kategori: {l.Category}, Status: {l.Status}{(string.IsNullOrWhiteSpace(l.Description) ? "" : $", Deskripsi: {l.Description}")}"))
                : "(Tidak ada catatan kegiatan tercatat kemarin)";

            // 3. Data Memori & Observasi Pengguna yang Masih Aktif
            var memoryUser = await _dbContext.AIMemories
                .Where(x => x.UserId == user.Id && x.Status == "Active")
                .OrderByDescending(x => x.LastObservedAt)
                .Take(6)
                .Select(a => new
                {
                    a.Key,
                    a.MemoryType,
                    a.Subject,
                    a.ValueJson,
                    Observations = a.Observations.OrderByDescending(o => o.ObservedAt).Take(2).Select(o => o.ObservationValue)
                })
                .ToListAsync();

            var memoryUserJson = JsonSerializer.Serialize(memoryUser, jsonOptions);

            string prompt = $@"
                Kamu adalah asisten pribadi AI yang cerdas, suportif, dan realistis.
                Tugasmu menyusun morning briefing yang memberi gambaran arah hari ini, strategi navigasi agenda, dan dorongan semangat yang membumi tanpa terdengar menggurui.

                [DATA MEMORI & OBSERVASI AKTIF]:
                {memoryUserJson}

                [CATATAN KEGIATAN KEMARIN]:
                {yesterdayActivitiesText}

                [DAFTAR AGENDA HARI INI]:
                {todayActivitiesText}

                ATURAN STRUKTUR & PEDOMAN NADA (WAJIB DIIKUTI):
                1. 'todayFocus':
                   - JIKA ADA AGENDA HARI INI (atau ada kegiatan kemarin): Angkat subjek/tema utama dari kegiatan tersebut. JANGAN PERNAH menyimpulkan hari sebagai 'hari bebas', 'hari santai kosong', atau 'tidak ada kegiatan'.
                   - JIKA TIDAK ADA AGENDA HARI INI DAN TIDAK ADA KEGIATAN KEMARIN: Tuliskan panduan umum tentang cara bagaimana semua orang dapat menjalankan hari secara produktif dan bermakna (misal: 'Menata Prioritas Diri, Menjaga Fokus Mental, dan Memberi Ruang pada Hal-Hal Esensial'). Buat tetap membumi, berwibawa, dan inspiratif.
                2. 'yesterdayContext':
                   - JIKA ADA KEGIATAN KEMARIN: Tuliskan 1-2 kalimat kilas balik yang cerdas untuk mengapresiasi atau merangkum apa yang telah dikerjakan kemarin sebagai pijakan hari ini.
                   - JIKA TIDAK ADA KEGIATAN KEMARIN: WAJIB dikosongkan (kembalikan string kosong """").
                3. 'activityStrategy':
                   - 1-2 kalimat saran taktis untuk mengeksekusi hari ini secara efektif (tulis sebagai saran santai).
                   - Jika agenda banyak: beri saran urutan penyelesaian/prioritas.
                   - Jika agenda hanya 1-2: sarankan cara mendalami kualitas penyelesaiannya atau menjaga stamina.
                   - Jika agenda kosong: sarankan kebiasaan produktif umum (misal: review catatan, eksplorasi ide, atau penataan ruang kerja).
                   - Jangan pernah mengasusikan bahwa kegiatan user sedikit karena tidak ada agenda sebagai hari santai, hari longgar, liburan.
                4. 'agendaGroups':
                   - HANYA berisi agenda riil dari [DAFTAR AGENDA HARI INI] yang dikelompokkan ke domain konkret (contoh: BMKG / Teknis, Kebugaran Fisik, Pengembangan Diri, Urusan Domestik). DILARANG memakai nama kategori generik.
                   - DILARANG KERAS MENGARANG TUGAS BARU DARI MEMORI ke dalam agendaGroups.
                   - JIKA AGENDA HARI INI KOSONG: Kembalikan array kosong []!
                   - Field 'items':
                     * 'task': Nama kegiatan inti tanpa jam.
                     * 'contextNote': 1 kalimat singkat tentang esensi/tujuan kegiatan tersebut.
                5. 'closingMotivation':
                   - 1-2 kalimat pemantik semangat yang relevan dengan beban atau fokus hari ini. Tetap membumi, tidak hiperbolis, dan memberi kesan optimis khas asisten AI.
                   - Jika pengguna kekurangan agenda/konteks hari ini, manfaatkan konteks proyek/kebiasaan dari [DATA MEMORI & OBSERVASI AKTIF] atau berikan motivasi harian universal yang menyegarkan.

                Kembalikan HANYA JSON valid tanpa blok markdown:
                {{
                ""todayFocus"": ""Tema atau subjek utama hari ini"",
                ""yesterdayContext"": ""Kilas balik kemarin jika ada, atau kosongkan"",
                ""activityStrategy"": ""Strategi taktis navigasi kegiatan hari ini"",
                ""agendaGroups"": [
                    {{
                    ""category"": ""Domain konkret kegiatan"",
                    ""items"": [
                        {{
                        ""task"": ""Nama kegiatan"",
                        ""contextNote"": ""Konteks praktis atau tujuan kegiatan""
                        }}
                    ]
                    }}
                ],
                ""closingMotivation"": ""Dorongan semangat ringkas yang relevan""
                }}";

            var rawResponse = await _aiService.ExecuteGeminiApi(prompt, "ApiKeyRecapDaily");
            var cleanJson = rawResponse.Replace("```json", "").Replace("```", "").Trim();
            _logger.LogInformation("Generated JSON: {Json}", cleanJson);
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = JsonSerializer.Deserialize<MorningBriefingDto>(cleanJson, options);
            if (result == null)
            {
                _logger.LogError("Morning summary JSON could not be deserialized: {Json}", cleanJson);
                return;
            }

            //await _aiRecapService.SaveRecapAsync(result);
            await _aiRecapService.SaveRecapJsonAsync(cleanJson, user.Id);
        }

    }

    //send email for morning briefing
    public async Task SendEmailMorningBriefingAsync()
    {
        var today = DateTime.Today; // Sesuaikan jika format tanggalmu string "yyyy-MM-dd"

        // 1 query efisien langsung menggabungkan validasi User, Feature, dan Summary
        var pendingSummaries = await _dbContext.AIDailySummaries
            .Include(s => s.User)
            .Where(s => !s.IsEmailSent
                     && s.CreatedAt.Date == today // Pastikan hanya kirim rangkuman hari ini
                     && _dbContext.UserAIFeatures.Any(uf => uf.UserId == s.UserId && uf.FeatureId == 2 && uf.IsEnabled))
            .ToListAsync();

        if (!pendingSummaries.Any()) return;

        foreach (var summary in pendingSummaries)
        {
            if (summary.User == null || string.IsNullOrWhiteSpace(summary.User.Email))
                continue;
            try
            {
                string subject = "Morning Briefing from AI Assistant";
                string body = BuildMorningSummaryHtml(summary.ContentJson);

                await _emailService.SendEmailAsync(subject, body, summary.User.Email);

                summary.IsEmailSent = true;
                summary.EmailSendAt = DateTime.Now;

                // Jeda antar pengiriman email agar mematuhi batasan rate limit SMTP
                await Task.Delay(1500);
            }
            catch (Exception ex)
            {
                // Log error per user agar jika 1 email gagal, email user lain tetap jalan
                _logger.LogError(ex, "Gagal mengirim email briefing ke {Email}", summary.User.Email);
            }
        }

        // Simpan semua status perubahan sekaligus ke database
        await _dbContext.SaveChangesAsync();
    }



    //AI schedule for AI memory
    public async Task CompileDailyAIMemoryFromActivity()
    {

        try
        {
            // 1. Ambil list UserId yang memiliki aktivitas hari ini (hemat token, abaikan user pasif)
            var userIdsWithActivities = await _dbContext.ActivityLogs
                .Select(a => a.UserId)
                .Distinct()
                .ToListAsync();

            if (!userIdsWithActivities.Any())
            {
                _logger.LogInformation("Tidak ada aktivitas user yang tercatat pada {TargetDate}. Job selesai.", userIdsWithActivities);
                return;
            }

            _logger.LogInformation("Ditemukan {Count} user dengan aktivitas hari ini untuk diproses memorinya.", userIdsWithActivities.Count);

            // 2. Proses memori per user dengan isolasi try-catch (error di 1 user tidak menggagalkan user lain)
            foreach (var userId in userIdsWithActivities)
            {
                try
                {
                    _logger.LogInformation("Memproses AI Memory untuk User ID: {UserId}", userId);

                    await _aiMemoryService.ProcessDailyMemoriesAsync(userId);
                    await Task.Delay(TimeSpan.FromSeconds(10));

                    _logger.LogInformation("Selesai memproses AI Memory untuk User ID: {UserId}", userId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Gagal memproses AI Memory untuk User ID: {UserId}", userId);
                    // Lanjut ke user berikutnya
                }
            }

            _logger.LogInformation("Seluruh proses kompilasi AI Memory harian selesai.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Terjadi kesalahan fatal saat menjalankan CompileDailyAIMemoryFromActivity");
            throw;
        }
    }

    private string BuildNightSummaryHtml(string summaryText, string positiveAffirmations, string actionableInsights)
    {
        var currentDate = DateTime.Now.ToString("dddd, dd MMMM yyyy", new System.Globalization.CultureInfo("id-ID"));

        return $@"
<!DOCTYPE html>
<html lang=""id"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Night Reflection</title>
</head>
<body style=""margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;"">
    <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""max-width: 600px; margin: 0 auto;"">
        
        <!-- HEADER BANNER: MIDNIGHT INDIGO GRADIENT -->
        <tr>
            <td style=""border-radius: 16px; padding: 28px 24px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4338ca 100%); box-shadow: 0 10px 20px -3px rgba(30, 27, 75, 0.35); text-align: left;"">
                <div style=""font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;"">
                    🌙 Night Reflection
                </div>
                <div style=""font-size: 13px; color: rgba(255, 255, 255, 0.88); margin-top: 4px; font-weight: 500;"">
                    {currentDate}
                </div>
                <div style=""margin-top: 14px;"">
                    <span style=""display: inline-block; background: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.28); color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 14px; border-radius: 9999px;"">
                        Close the day with calm reflection
                    </span>
                </div>
            </td>
        </tr>

        <!-- CARD 1: SUMMARY -->
        <tr>
            <td style=""padding-top: 16px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #c7d2fe; border-left: 5px solid #4f46e5; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #4f46e5; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;"">
                                📋 RANGKUMAN REFLEKSI HARI INI
                            </div>
                            <div style=""font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;"">
                                {System.Net.WebUtility.HtmlEncode(summaryText)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- CARD 2: POSITIVE NOTE -->
        <tr>
            <td style=""padding-top: 14px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #fbcfe8; border-left: 5px solid #db2777; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #db2777; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;"">
                                💖 APRESIASI & AFIRMASI POSITIF
                            </div>
                            <div style=""font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;"">
                                {System.Net.WebUtility.HtmlEncode(positiveAffirmations)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- CARD 3: ACTIONABLE INSIGHT -->
        <tr>
            <td style=""padding-top: 14px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #a7f3d0; border-left: 5px solid #059669; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #059669; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;"">
                                🚀 LANGKAH KECIL ESOK HARI
                            </div>
                            <div style=""font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-line;"">
                                {System.Net.WebUtility.HtmlEncode(actionableInsights)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- FOOTER -->
        <tr>
            <td style=""padding: 24px 12px 12px 12px; text-align: center;"">
                <p style=""margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #475569;"">
                    AI Personal Assistant
                </p>
                <p style=""margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-style: italic;"">
                    ""Let this night settle softly. Istirahat yang cukup untuk esok yang baru.""
                </p>
                <p style=""margin: 0; font-size: 11px; color: #cbd5e1;"">
                    Pemberitahuan terjadwal • Mohon jangan membalas email ini (No-Reply)
                </p>
            </td>
        </tr>

    </table>
</body>
</html>";
    }

    private static (string AccentColor, string BadgeBg, string BadgeText, string Icon) GetCategoryVisuals(string category)
    {
        var cat = (category ?? string.Empty).ToLowerInvariant();
        if (cat.Contains("proyek") || cat.Contains("app") || cat.Contains("dev") || cat.Contains("kerja") || cat.Contains("work") || cat.Contains("tugas") || cat.Contains("kantor"))
        {
            return ("#6366f1", "#eef2ff", "#4338ca", "💼");
        }
        if (cat.Contains("rumah") || cat.Contains("home") || cat.Contains("pribadi") || cat.Contains("keluarga") || cat.Contains("family"))
        {
            return ("#f59e0b", "#fef3c7", "#b45309", "🏡");
        }
        if (cat.Contains("meeting") || cat.Contains("janji") || cat.Contains("diskusi") || cat.Contains("klien") || cat.Contains("call"))
        {
            return ("#0284c7", "#e0f2fe", "#0369a1", "👥");
        }
        if (cat.Contains("sehat") || cat.Contains("olahraga") || cat.Contains("rutinitas") || cat.Contains("ibadah") || cat.Contains("daily") || cat.Contains("belajar"))
        {
            return ("#10b981", "#ecfdf5", "#047857", "🌿");
        }
        return ("#8b5cf6", "#f3e8ff", "#6d28d9", "📋");
    }

    private static string BuildMorningSummaryHtml(string contentJson)
    {
        var currentDate = DateTime.Now.ToString("dddd, dd MMMM yyyy", new System.Globalization.CultureInfo("id-ID"));

        MorningBriefingDto briefing;
        try
        {
            briefing = JsonSerializer.Deserialize<MorningBriefingDto>(
                contentJson,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? new MorningBriefingDto();
        }
        catch
        {
            briefing = new MorningBriefingDto
            {
                TodayFocus = "Gagal memuat fokus hari ini.",
                YesterdayContext = string.Empty,
                ActivityStrategy = "Gagal memuat strategi kegiatan.",
                ClosingMotivation = "Format data briefing tidak valid. Silakan cek log server."
            };
        }

        // Render kartu agenda dinamis per kelompok kategori
        var agendaHtml = new StringBuilder();
        if (briefing.AgendaGroups != null && briefing.AgendaGroups.Count > 0)
        {
            foreach (var group in briefing.AgendaGroups)
            {
                var visuals = GetCategoryVisuals(group.Category);
                int itemCount = group.Items?.Count ?? 0;

                agendaHtml.Append($@"
        <!-- KATEGORI: {System.Net.WebUtility.HtmlEncode(group.Category)} -->
        <tr>
            <td style=""padding-top: 14px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; border-left: 5px solid {visuals.AccentColor}; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <!-- Category Header -->
                            <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""margin-bottom: 12px;"">
                                <tr>
                                    <td align=""left"" style=""vertical-align: middle;"">
                                        <span style=""font-size: 13px; font-weight: 800; color: {visuals.AccentColor}; letter-spacing: 0.05em; text-transform: uppercase;"">
                                            {visuals.Icon} {System.Net.WebUtility.HtmlEncode(group.Category)}
                                        </span>
                                    </td>
                                    <td align=""right"" style=""vertical-align: middle;"">
                                        <span style=""display: inline-block; background-color: {visuals.BadgeBg}; color: {visuals.BadgeText}; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 9999px;"">
                                            {itemCount} Tugas
                                        </span>
                                    </td>
                                </tr>
                            </table>

                            <!-- Items List -->
                            <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">");

                if (group.Items != null && group.Items.Count > 0)
                {
                    for (int i = 0; i < group.Items.Count; i++)
                    {
                        var item = group.Items[i];
                        bool isLast = i == group.Items.Count - 1;
                        string borderStyle = isLast ? "" : "border-bottom: 1px solid #f1f5f9;";

                        agendaHtml.Append($@"
                                <tr>
                                    <td style=""padding: 10px 0; {borderStyle}"">
                                        <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"">
                                            <tr>
                                                <td style=""width: 22px; vertical-align: top; padding-top: 2px;"">
                                                    <div style=""width: 16px; height: 16px; border-radius: 50%; background-color: {visuals.BadgeBg}; color: {visuals.AccentColor}; font-size: 10px; line-height: 16px; text-align: center; font-weight: 800;"">✓</div>
                                                </td>
                                                <td style=""vertical-align: top; padding-left: 6px;"">
                                                    <div style=""font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4;"">
                                                        {System.Net.WebUtility.HtmlEncode(item.Task)}
                                                    </div>
                                                    {(string.IsNullOrWhiteSpace(item.ContextNote) ? "" : $@"<div style=""font-size: 13px; color: #64748b; margin-top: 4px; line-height: 1.5;"">{System.Net.WebUtility.HtmlEncode(item.ContextNote)}</div>")}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>");
                    }
                }
                else
                {
                    agendaHtml.Append(@"
                                <tr>
                                    <td style=""padding: 8px 0; font-size: 13px; color: #94a3b8; font-style: italic;"">
                                        Tidak ada rincian tugas spesifik pada kategori ini.
                                    </td>
                                </tr>");
                }

                agendaHtml.Append(@"
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>");
            }
        }

        return $@"
<!DOCTYPE html>
<html lang=""id"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Morning Focus Brief</title>
</head>
<body style=""margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;"">
    <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""max-width: 600px; margin: 0 auto;"">
        
        <!-- HEADER BANNER: WARM SUNRISE GRADIENT -->
        <tr>
            <td style=""border-radius: 16px; padding: 28px 24px; background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%); box-shadow: 0 10px 20px -3px rgba(234, 88, 12, 0.25); text-align: left;"">
                <div style=""font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;"">
                    🌅 Morning Focus Brief
                </div>
                <div style=""font-size: 13px; color: rgba(255, 255, 255, 0.92); margin-top: 4px; font-weight: 500;"">
                    {currentDate}
                </div>
                <div style=""margin-top: 14px;"">
                    <span style=""display: inline-block; background: rgba(255, 255, 255, 0.22); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 14px; border-radius: 9999px;"">
                        Plan your direction for a productive day
                    </span>
                </div>
            </td>
        </tr>

        <!-- CARD 1: FOKUS UTAMA HARI INI -->
        <tr>
            <td style=""padding-top: 16px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #fed7aa; border-left: 5px solid #ea580c; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #ea580c; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;"">
                                🎯 FOKUS UTAMA HARI INI
                            </div>
                            <div style=""font-size: 16px; font-weight: 700; color: #0f172a; line-height: 1.5;"">
                                {System.Net.WebUtility.HtmlEncode(briefing.TodayFocus)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>

        <!-- CARD 2: KILAS BALIK KEMARIN (KONDISIONAL - HANYA TAMPIL JIKA ADA KEGIATAN KEMARIN) -->
        {(!string.IsNullOrWhiteSpace(briefing.YesterdayContext) ? $@"
        <tr>
            <td style=""padding-top: 14px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #ddd6fe; border-left: 5px solid #8b5cf6; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #7c3aed; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;"">
                                🔄 KILAS BALIK & PROGRES KEMARIN
                            </div>
                            <div style=""font-size: 14px; line-height: 1.6; color: #4c1d95; font-weight: 500;"">
                                {System.Net.WebUtility.HtmlEncode(briefing.YesterdayContext)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>" : "")}

        <!-- CARD 3: STRATEGI & SARAN TAKTIS -->
        {(!string.IsNullOrWhiteSpace(briefing.ActivityStrategy) ? $@"
        <tr>
            <td style=""padding-top: 14px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #bfdbfe; border-left: 5px solid #2563eb; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #2563eb; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;"">
                                💡 STRATEGI & SARAN TAKTIS
                            </div>
                            <div style=""font-size: 14px; line-height: 1.6; color: #1e3a8a; font-weight: 500;"">
                                {System.Net.WebUtility.HtmlEncode(briefing.ActivityStrategy)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>" : "")}

        <!-- DYNAMIC AGENDA GROUPS SECTION (KONDISIONAL - HANYA TAMPIL JIKA ADA AGENDA RIIL) -->
        {agendaHtml}

        <!-- CARD 4: CLOSING MOTIVATION & DORONGAN REALISTIS -->
        {(!string.IsNullOrWhiteSpace(briefing.ClosingMotivation) ? $@"
        <tr>
            <td style=""padding-top: 14px;"">
                <table role=""presentation"" border=""0"" cellpadding=""0"" cellspacing=""0"" width=""100%"" style=""background-color: #ffffff; border-radius: 14px; border: 1px solid #bbf7d0; border-left: 5px solid #16a34a; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);"">
                    <tr>
                        <td style=""padding: 18px 20px;"">
                            <div style=""font-size: 11px; font-weight: 800; color: #16a34a; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px;"">
                                🌱 PESAN HARI INI & DORONGAN REALISTIS
                            </div>
                            <div style=""font-size: 14px; line-height: 1.6; color: #166534; font-weight: 500;"">
                                {System.Net.WebUtility.HtmlEncode(briefing.ClosingMotivation)}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>" : "")}

        <!-- FOOTER -->
        <tr>
            <td style=""padding: 24px 12px 12px 12px; text-align: center;"">
                <p style=""margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #475569;"">
                    AI Personal Assistant
                </p>
                <p style=""margin: 0 0 6px 0; font-size: 12px; color: #94a3b8; font-style: italic;"">
                    ""Let’s make today counted. Dari AI Assistant untuk harimu yang terarah.""
                </p>
                <p style=""margin: 0; font-size: 11px; color: #cbd5e1;"">
                    Pemberitahuan terjadwal • Mohon jangan membalas email ini (No-Reply)
                </p>
            </td>
        </tr>

    </table>
</body>
</html>";
    }
}