using System.Security.Claims;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.DTOs.AIReflectionActivity;
using AIPersonalAssistant.DTOs.TracebackMemory;
using AIPersonalAssistant.Extension;
using AIPersonalAssistant.Models;
using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ActivityController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ActivityController> _logger;
    private readonly AIGeminiService _aiGeminiService;
    private readonly ReflectionService _reflectionService;
    private readonly TracebackMemoryService _tracebackService;

    public ActivityController(
        AppDbContext dbContext,
        ILogger<ActivityController> logger,
        AIGeminiService aiGeminiService,
        ReflectionService reflectionService, TracebackMemoryService tracebackMemoryService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _aiGeminiService = aiGeminiService;
        _reflectionService = reflectionService;
        _tracebackService = tracebackMemoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivities(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? timeline = null,
        [FromQuery] string? category = null,
        [FromQuery] string? date = null,
        [FromQuery] string? search = null)
    {
        try
        {
            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.GetActivities called. page={Page}, pageSize={PageSize}, status={Status}, timeline={Timeline}, category={Category}, date={Date}, search={Search}",
                page, pageSize, status, timeline, category, date, search);

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _dbContext.ActivityLogs.Where(x => x.UserId == userId);

            var todayLocal = DateTime.Now.Date;
            var startOfToday = todayLocal;
            var endOfToday = startOfToday.AddDays(1).AddTicks(-1);

            var overdueCount = await _dbContext.ActivityLogs
                .Where(x => x.UserId == userId && x.Status != "Completed" && x.Status != "Cancelled" && (x.ReminderTime ?? x.CreateAt) < startOfToday)
                .CountAsync();

            if (!string.IsNullOrWhiteSpace(timeline))
            {
                var timelineLower = timeline.Trim().ToLowerInvariant();

                if (timelineLower == "today")
                {
                    // Fokus Hari Ini: tugas hari ini berdasarkan waktu lokal komputer
                    query = query.Where(x => x.Status != "Completed" && x.Status != "Cancelled" && ((x.ReminderTime ?? x.CreateAt) >= startOfToday && (x.ReminderTime ?? x.CreateAt) <= endOfToday));
                }
                else if (timelineLower == "upcoming")
                {
                    // Mendatang: tugas besok dan seterusnya
                    query = query.Where(x => x.Status != "Completed" && x.Status != "Cancelled" && (x.ReminderTime ?? x.CreateAt) > endOfToday);
                }
                else if (timelineLower == "overdue")
                {
                    // Terlewat: tugas kemarin atau sebelumnya yang belum selesai
                    query = query.Where(x => x.Status != "Completed" && x.Status != "Cancelled" && (x.ReminderTime ?? x.CreateAt) < startOfToday);
                }
                else if (timelineLower == "completed")
                {
                    query = query.Where(x => x.Status == "Completed");
                }
            }
            else if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.Status == status);
            }

            // Filter Kategori
            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                var categoryLower = category.Trim().ToLower();
                query = query.Where(x => x.Category.ToLower() == categoryLower);
            }

            // Filter Tanggal (format: YYYY-MM-DD)
            if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var parsedDate))
            {
                var startOfDay = parsedDate.Date;
                var endOfDay = startOfDay.AddDays(1).AddTicks(-1);

                if (status?.Equals("Completed", StringComparison.OrdinalIgnoreCase) == true || timeline?.Equals("completed", StringComparison.OrdinalIgnoreCase) == true)
                {
                    query = query.Where(x => (x.CompletedAt ?? x.CreateAt) >= startOfDay && (x.CompletedAt ?? x.CreateAt) <= endOfDay);
                }
                else
                {
                    query = query.Where(x => ((x.ReminderTime ?? x.CreateAt) >= startOfDay && (x.ReminderTime ?? x.CreateAt) <= endOfDay));
                }
            }

            // Filter Teks Pencarian (mencakup Judul, Deskripsi, dan Kategori)
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(x =>
                    EF.Functions.Like(x.Title, $"%{s}%") ||
                    (x.Description != null && EF.Functions.Like(x.Description, $"%{s}%")) ||
                    (x.Category != null && EF.Functions.Like(x.Category, $"%{s}%")));
            }

            var totalCount = await query.CountAsync();

            IOrderedQueryable<ActivityLogs> orderedQuery;
            if (timeline?.Equals("upcoming", StringComparison.OrdinalIgnoreCase) == true)
            {
                orderedQuery = query.OrderBy(a => a.ReminderTime ?? a.CreateAt).ThenByDescending(a => a.Id);
            }
            else if (timeline?.Equals("overdue", StringComparison.OrdinalIgnoreCase) == true)
            {
                orderedQuery = query.OrderBy(a => a.ReminderTime ?? a.CreateAt).ThenByDescending(a => a.Id);
            }
            else if (status?.Equals("Completed", StringComparison.OrdinalIgnoreCase) == true || timeline?.Equals("completed", StringComparison.OrdinalIgnoreCase) == true)
            {
                orderedQuery = query.OrderByDescending(a => a.CompletedAt ?? a.CreateAt).ThenByDescending(a => a.Id);
            }
            else
            {
                orderedQuery = query.OrderByDescending(a => a.ReminderTime ?? a.CreateAt).ThenByDescending(a => a.Id);
            }

            var items = await orderedQuery
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ActivityResponseDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Description = a.Description,
                    Category = a.Category,
                    Status = a.Status,
                    CreatedAt = a.CreateAt,
                    RemindAt = a.ReminderTime ?? a.CreateAt,
                    OriginalRemindAt = a.OriginalReminderTime ?? a.CreateAt,
                    IsReminder = a.IsReminder,
                    RescheduleCount = a.RescheduleCount,
                    CompletedAt = a.CompletedAt,
                    ResolutionSource = a.ResolutionSource,
                    Note = a.Note
                })
                .ToListAsync();

            var result = new PagedResultDto<ActivityResponseDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                OverdueCount = overdueCount
            };

            _logger.LogInformation("ActivityController.GetActivities completed. Returned {Count} items.", items.Count);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.GetActivities failed.");
            return StatusCode(500, "Error retrieving activities.");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetActivity(int id)
    {
        try
        {
            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.GetActivity called. id={Id}", id);

            var activity = await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (activity == null)
            {
                _logger.LogWarning("ActivityController.GetActivity not found. id={Id}", id);
                return NotFound();
            }

            var activityDto = new ActivityResponseDto
            {
                Id = activity.Id,
                Title = activity.Title,
                Description = activity.Description,
                Category = activity.Category,
                Status = activity.Status,
                CreatedAt = activity.CreateAt,
                RemindAt = activity.ReminderTime ?? activity.CreateAt,
                OriginalRemindAt = activity.OriginalReminderTime ?? activity.CreateAt,
                IsReminder = activity.IsReminder,
                RescheduleCount = activity.RescheduleCount,
                CompletedAt = activity.CompletedAt,
                ResolutionSource = activity.ResolutionSource,
                Note = activity.Note
            };

            return Ok(activityDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.GetActivity failed. id={Id}", id);
            return StatusCode(500, "Error retrieving activity.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateActivity([FromBody] CreateActivityDto? createActivityDto)
    {
        try
        {
            if (createActivityDto == null)
            {
                _logger.LogWarning("ActivityController.CreateActivity received null payload.");
                return BadRequest("Activity payload is required.");
            }

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("ActivityController.CreateActivity validation failed.");
                return BadRequest(ModelState);
            }

            int userId = User.GetUserId();
            bool hasSchedule = createActivityDto.RemindAt.HasValue;
            DateTime? remindAtLocal = null;

            if (hasSchedule)
            {
                remindAtLocal = createActivityDto.RemindAt.Value.Kind == DateTimeKind.Utc
                    ? createActivityDto.RemindAt.Value.ToLocalTime()
                    : createActivityDto.RemindAt.Value;

                if (remindAtLocal <= DateTime.Now)
                {
                    return BadRequest(new { message = "Waktu jadwal kegiatan harus lebih besar dari waktu sekarang." });
                }
            }

            var activity = new ActivityLogs
            {
                Title = createActivityDto.Title.Trim(),
                Description = createActivityDto.Description.Trim(),
                Category = string.IsNullOrWhiteSpace(createActivityDto.Category) ? "General" : createActivityDto.Category.Trim(),
                IsReminder = hasSchedule && createActivityDto.IsReminder,
                ReminderTime = remindAtLocal,
                OriginalReminderTime = remindAtLocal,
                Status = hasSchedule ? "Pending" : "Completed",
                RescheduleCount = 0,
                CreateAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                UserId = userId,
                ResolutionSource = "ManualUI",
                CompletedAt = hasSchedule ? null : DateTime.Now,
            };

            _dbContext.ActivityLogs.Add(activity);
            await _dbContext.SaveChangesAsync();

            var activityResponseDto = new ActivityResponseDto
            {
                Id = activity.Id,
                Title = activity.Title,
                Description = activity.Description,
                Category = activity.Category,
                Status = activity.Status,
                CreatedAt = activity.CreateAt,
                RemindAt = activity.ReminderTime,
                OriginalRemindAt = activity.OriginalReminderTime,
                IsReminder = activity.IsReminder,
                RescheduleCount = activity.RescheduleCount,
                ResolutionSource = activity.ResolutionSource
            };

            _logger.LogInformation("ActivityController.CreateActivity completed. id={Id}", activity.Id);
            return CreatedAtAction(nameof(GetActivity), new { id = activity.Id }, activityResponseDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.CreateActivity failed.");
            return StatusCode(500, "Error creating activity.");
        }
    }


    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateActivity(int id, [FromBody] UpdateActivityDto? dto)
    {
        try
        {
            if (dto == null)
            {
                return BadRequest("Payload pembaruan aktivitas wajib diisi.");
            }

            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.UpdateActivity called. id={Id}", id);

            var activity = await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (activity == null)
            {
                _logger.LogWarning("ActivityController.UpdateActivity not found. id={Id}", id);
                return NotFound(new { message = "Aktivitas tidak ditemukan." });
            }

            // Jika aktivitas sudah Completed/Achieved: hanya bisa ganti deskripsi/catatan saja (jadwal, kategori, judul, status dikunci)
            if (activity.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            {
                if (dto.Description != null)
                {
                    activity.Description = dto.Description.Trim();
                }

                if (dto.Note != null)
                {
                    activity.Note = dto.Note;
                }

                activity.UpdatedAt = DateTime.Now;
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("ActivityController.UpdateActivity (Completed description only) completed. id={Id}", id);
                return Ok(new
                {
                    success = true,
                    message = "Deskripsi pencapaian berhasil diperbarui.",
                    activity = new ActivityResponseDto
                    {
                        Id = activity.Id,
                        Title = activity.Title,
                        Description = activity.Description,
                        Category = activity.Category,
                        Status = activity.Status,
                        CreatedAt = activity.CreateAt,
                        RemindAt = activity.ReminderTime,
                        OriginalRemindAt = activity.OriginalReminderTime,
                        IsReminder = activity.IsReminder,
                        RescheduleCount = activity.RescheduleCount,
                        CompletedAt = activity.CompletedAt,
                        ResolutionSource = activity.ResolutionSource,
                        Note = activity.Note
                    }
                });
            }

            if (!string.IsNullOrWhiteSpace(dto.Title))
            {
                activity.Title = dto.Title.Trim();
            }

            if (dto.Description != null)
            {
                activity.Description = dto.Description.Trim();
            }

            if (!string.IsNullOrWhiteSpace(dto.Category))
            {
                activity.Category = dto.Category.Trim();
            }

            if (dto.RemindAt.HasValue)
            {
                var remindAtLocal = dto.RemindAt.Value.Kind == DateTimeKind.Utc
                    ? dto.RemindAt.Value.ToLocalTime()
                    : dto.RemindAt.Value;

                if (remindAtLocal <= DateTime.Now)
                {
                    return BadRequest(new { message = "Waktu jadwal kegiatan harus lebih besar dari waktu sekarang." });
                }

                // Jika waktu jadwal diubah dan sebelumnya sudah ada jadwal
                if (activity.ReminderTime.HasValue && Math.Abs((activity.ReminderTime.Value - remindAtLocal).TotalMinutes) > 1)
                {
                    activity.Status = "Rescheduled";
                    activity.RescheduleCount += 1;
                    // Reschedule: default notifikasi email aktif
                    activity.IsReminder = dto.IsReminder ?? true;
                }
                else if (dto.IsReminder.HasValue)
                {
                    activity.IsReminder = dto.IsReminder.Value;
                }
                activity.ReminderTime = remindAtLocal;
            }
            else if (dto.IsReminder.HasValue)
            {
                activity.IsReminder = dto.IsReminder.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Status) && dto.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            {
                activity.Status = "Completed";
                activity.CompletedAt = DateTime.Now;
                activity.ResolutionSource = dto.ResolutionSource ?? "ManualCheck";
                activity.IsReminder = false; // Selesai: reminder email harus false
            }
            else if (!string.IsNullOrWhiteSpace(dto.Status) && dto.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                activity.Status = "Cancelled";
                activity.ResolutionSource = dto.ResolutionSource ?? "ManualCancel";
                activity.IsReminder = false; // Batal: reminder email harus false
            }

            if (dto.Note != null)
            {
                activity.Note = dto.Note;
            }

            activity.UpdatedAt = DateTime.Now;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("ActivityController.UpdateActivity completed. id={Id}", id);
            return Ok(new
            {
                success = true,
                message = "Aktivitas berhasil diperbarui.",
                activity = new ActivityResponseDto
                {
                    Id = activity.Id,
                    Title = activity.Title,
                    Description = activity.Description,
                    Category = activity.Category,
                    Status = activity.Status,
                    CreatedAt = activity.CreateAt,
                    RemindAt = activity.ReminderTime ?? activity.CreateAt,
                    OriginalRemindAt = activity.OriginalReminderTime ?? activity.CreateAt,
                    IsReminder = activity.IsReminder,
                    RescheduleCount = activity.RescheduleCount,
                    CompletedAt = activity.CompletedAt,
                    ResolutionSource = activity.ResolutionSource,
                    Note = activity.Note
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.UpdateActivity failed. id={Id}", id);
            return StatusCode(500, "Error updating activity.");
        }
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateActivityStatus(int id, [FromBody] UpdateActivityStatusDto? dto)
    {
        try
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Status))
            {
                return BadRequest("Status is required.");
            }

            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.UpdateActivityStatus called. id={Id}, newStatus={Status}", id, dto.Status);

            var activity = await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (activity == null)
            {
                _logger.LogWarning("ActivityController.UpdateActivityStatus not found. id={Id}", id);
                return NotFound(new { message = "Aktivitas tidak ditemukan." });
            }

            // Larang pengembalian ke status Fokus/Pending jika aktivitas sudah selesai
            if (activity.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Aktivitas yang telah selesai tidak dapat diubah statusnya." });
            }

            if (!dto.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase) && !dto.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Hanya perubahan ke status 'Completed' atau 'Cancelled' yang diizinkan." });
            }

            if (dto.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                activity.Status = "Cancelled";
                activity.ResolutionSource = dto.ResolutionSource ?? "ManualCancel";
                activity.IsReminder = false; // Batal: reminder email harus false
            }
            else
            {
                activity.Status = "Completed";
                activity.CompletedAt = DateTime.Now;
                activity.ResolutionSource = dto.ResolutionSource ?? "ManualCheck";
                activity.IsReminder = false; // Selesai: reminder email harus false
            }

            if (dto.Note != null)
            {
                activity.Note = dto.Note;
            }

            activity.UpdatedAt = DateTime.Now;

            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("ActivityController.UpdateActivityStatus completed. id={Id}, status={Status}", id, activity.Status);
            return Ok(new
            {
                success = true,
                message = $"Status aktivitas berhasil diubah menjadi {activity.Status}.",
                activity = new ActivityResponseDto
                {
                    Id = activity.Id,
                    Title = activity.Title,
                    Description = activity.Description,
                    Category = activity.Category,
                    Status = activity.Status,
                    CreatedAt = activity.CreateAt,
                    RemindAt = activity.ReminderTime,
                    OriginalRemindAt = activity.OriginalReminderTime,
                    IsReminder = activity.IsReminder,
                    RescheduleCount = activity.RescheduleCount,
                    CompletedAt = activity.CompletedAt,
                    ResolutionSource = activity.ResolutionSource,
                    Note = activity.Note
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.UpdateActivityStatus failed. id={Id}", id);
            return StatusCode(500, "Error updating activity status.");
        }
    }

    [HttpPost("parse-voice")]
    public async Task<IActionResult> ParseFromVoice([FromBody] ParseVoiceRequestDto? dto)
    {
        try
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.SpeechText))
            {
                return BadRequest(new ParseVoiceResponseDto
                {
                    Success = false,
                    Message = "Teks suara tidak boleh kosong."
                });
            }

            _logger.LogInformation("ActivityController.ParseFromVoice called. SpeechTextLength={Length}", dto.SpeechText.Length);

            DateTime clientNow = DateTime.Now;

            var parsedActivities = await _aiGeminiService.ParseActivityFromSpeechAsync(dto.SpeechText, clientNow);

            return Ok(new ParseVoiceResponseDto
            {
                Success = true,
                RawTranscript = dto.SpeechText,
                Activities = parsedActivities,
                Message = $"Berhasil mem-parsing {parsedActivities.Count} kegiatan dari suara dengan Gemini AI."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.ParseFromVoice failed.");
            var fallback = new CreateActivityDto
            {
                Title = (dto?.SpeechText?.Length > 50 ? dto.SpeechText.Substring(0, 50) + "..." : dto?.SpeechText) ?? string.Empty,
                Description = dto?.SpeechText ?? string.Empty,
                Category = "General",
                IsReminder = true,
                RemindAt = null
            };

            return Ok(new ParseVoiceResponseDto
            {
                Success = false,
                RawTranscript = dto?.SpeechText ?? string.Empty,
                Activities = new List<CreateActivityDto> { fallback },
                Message = $"Gemini AI gagal memproses ({ex.Message}). Teks suara Anda dimasukkan ke form agar dapat diedit secara manual."
            });
        }
    }

    [HttpPost("batch")]
    public async Task<IActionResult> CreateActivitiesBatch([FromBody] List<CreateActivityDto>? dtoList)
    {
        try
        {
            if (dtoList == null || dtoList.Count == 0)
            {
                return BadRequest(new { message = "Daftar aktivitas tidak boleh kosong." });
            }

            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.CreateActivitiesBatch called. Count={Count}, UserId={UserId}", dtoList.Count, userId);

            var createdActivities = new List<ActivityLogs>();

            foreach (var dto in dtoList)
            {
                if (string.IsNullOrWhiteSpace(dto.Title))
                {
                    continue;
                }

                DateTime? remindAtLocal = null;
                bool hasSchedule = dto.RemindAt.HasValue;
                if (hasSchedule)
                {
                    remindAtLocal = dto.RemindAt.Value.Kind == DateTimeKind.Utc
                        ? dto.RemindAt.Value.ToLocalTime()
                        : dto.RemindAt.Value;
                }

                var activity = new ActivityLogs
                {
                    Title = dto.Title.Trim(),
                    Description = dto.Description?.Trim() ?? string.Empty,
                    Category = string.IsNullOrWhiteSpace(dto.Category) ? "General" : dto.Category.Trim(),
                    IsReminder = hasSchedule && dto.IsReminder,
                    ReminderTime = remindAtLocal,
                    OriginalReminderTime = remindAtLocal,
                    Status = hasSchedule ? "Pending" : "Completed",
                    RescheduleCount = 0,
                    CreateAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    UserId = userId,
                    ResolutionSource = "VoiceBatch",
                    CompletedAt = hasSchedule ? null : DateTime.Now
                };

                createdActivities.Add(activity);
            }

            if (createdActivities.Count == 0)
            {
                return BadRequest(new { message = "Tidak ada aktivitas valid yang dapat disimpan." });
            }

            _dbContext.ActivityLogs.AddRange(createdActivities);
            await _dbContext.SaveChangesAsync();

            var responseDtos = createdActivities.Select(act => new ActivityResponseDto
            {
                Id = act.Id,
                Title = act.Title,
                Description = act.Description,
                Category = act.Category,
                Status = act.Status,
                CreatedAt = act.CreateAt,
                RemindAt = act.ReminderTime,
                OriginalRemindAt = act.OriginalReminderTime,
                IsReminder = act.IsReminder,
                RescheduleCount = act.RescheduleCount,
                ResolutionSource = act.ResolutionSource
            }).ToList();

            _logger.LogInformation("ActivityController.CreateActivitiesBatch succeeded. Saved={Count} activities.", createdActivities.Count);
            return Ok(new
            {
                success = true,
                message = $"{responseDtos.Count} aktivitas berhasil disimpan.",
                activities = responseDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.CreateActivitiesBatch failed.");
            return StatusCode(500, "Terjadi kesalahan saat menyimpan aktivitas sekaligus.");
        }
    }

    // ==========================================
    // REFLECTION ENDPOINTS (AI-COMPILED CONTEXT & SUBMISSION)
    // ==========================================

    /// <summary>
    /// Mengambil konteks refleksi yang sudah dikompilasi dan disaring oleh AI
    /// </summary>
    /// <param name="type">"Daily" atau "Weekly"</param>
    [HttpGet("reflection/context")]
    public async Task<IActionResult> GetReflectionContext()
    {
        try
        {
            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.GetReflectionContext called for UserId={UserId}", userId);

            var context = await _reflectionService.GetReflectionContextAsync(userId);
            return Ok(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.GetReflectionContext failed.");
            return StatusCode(500, "Gagal mengambil data konteks refleksi AI.");
        }
    }

    [HttpPost("submit")]
    public async Task<IActionResult> Submit([FromBody] ReflectionContextDto request)
    {
        int userId = User.GetUserId();
        var result = await _reflectionService.ProcessReflectionTranscriptAsync(userId, request);
        return Ok(result);
    }

    [HttpPost("traceback-memory")]
    public async Task<IActionResult> TracebackMemory(VoiceProcessRequestDto voiceProcessRequestDto)
    {
        try
        {
            if (voiceProcessRequestDto == null || string.IsNullOrWhiteSpace(voiceProcessRequestDto.UserSpeechInput))
            {
                return BadRequest(new { message = "Input suara tidak boleh kosong." });
            }
            var userId = User.GetUserId();
            var result = await _tracebackService.ProcessTurnAsync(userId, voiceProcessRequestDto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Terjadi kendala saat memproses interaksi suara.",
                detail = ex.Message
            });
        }
    }
}