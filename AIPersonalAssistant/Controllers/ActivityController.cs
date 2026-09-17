using System.Security.Claims;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.DTOs.AIReflectionActivity;
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

    public ActivityController(
        AppDbContext dbContext,
        ILogger<ActivityController> logger,
        AIGeminiService aiGeminiService,
        ReflectionService reflectionService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _aiGeminiService = aiGeminiService;
        _reflectionService = reflectionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivities([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? status = null)
    {
        try
        {
            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.GetActivities called. page={Page}, pageSize={PageSize}, status={Status}", page, pageSize, status);

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _dbContext.ActivityLogs.Where(x => x.UserId == userId);

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.Status == status);
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(a => a.CreateAt)
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
                    RemindAt = a.ReminderTime,
                    OriginalRemindAt = a.OriginalReminderTime,
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
                PageSize = pageSize
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
                RemindAt = activity.ReminderTime,
                OriginalRemindAt = activity.OriginalReminderTime,
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
            var activity = new ActivityLogs
            {
                Title = createActivityDto.Title,
                Description = createActivityDto.Description,
                Category = string.IsNullOrWhiteSpace(createActivityDto.Category) ? "General" : createActivityDto.Category,
                IsReminder = createActivityDto.IsReminder,
                ReminderTime = createActivityDto.RemindAt,
                OriginalReminderTime = createActivityDto.RemindAt,
                Status = hasSchedule ? "Pending" : "Completed",
                RescheduleCount = 0,
                CreateAt = DateTime.UtcNow,
                UserId = userId,
                ResolutionSource = "ManualUI",
                CompletedAt = hasSchedule ? null : DateTime.UtcNow,
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteActivity(int id)
    {
        try
        {
            int userId = User.GetUserId();
            _logger.LogInformation("ActivityController.DeleteActivity called. id={Id}", id);

            var activity = await _dbContext.ActivityLogs.FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);
            if (activity == null)
            {
                _logger.LogWarning("ActivityController.DeleteActivity not found. id={Id}", id);
                return NotFound();
            }

            _dbContext.ActivityLogs.Remove(activity);
            await _dbContext.SaveChangesAsync();

            _logger.LogInformation("ActivityController.DeleteActivity completed. id={Id}", id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.DeleteActivity failed. id={Id}", id);
            return StatusCode(500, "Error deleting activity.");
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

            DateTime clientNow = DateTime.UtcNow.AddHours(7);
            if (!string.IsNullOrWhiteSpace(dto.ClientTimeZone))
            {
                try
                {
                    var tz = TimeZoneInfo.FindSystemTimeZoneById(dto.ClientTimeZone);
                    clientNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
                }
                catch
                {
                    // Fallback to GMT+7
                }
            }

            var parsedActivity = await _aiGeminiService.ParseActivityFromSpeechAsync(dto.SpeechText, clientNow);

            return Ok(new ParseVoiceResponseDto
            {
                Success = true,
                RawTranscript = dto.SpeechText,
                Activity = parsedActivity,
                Message = "Berhasil mem-parsing suara dengan Gemini AI."
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ActivityController.ParseFromVoice failed.");
            return Ok(new ParseVoiceResponseDto
            {
                Success = false,
                RawTranscript = dto?.SpeechText ?? string.Empty,
                Activity = new CreateActivityDto
                {
                    Title = (dto?.SpeechText?.Length > 50 ? dto.SpeechText.Substring(0, 50) + "..." : dto?.SpeechText) ?? string.Empty,
                    Description = dto?.SpeechText ?? string.Empty,
                    Category = "General",
                    IsReminder = false,
                    RemindAt = null
                },
                Message = $"Gemini AI gagal memproses ({ex.Message}). Teks suara Anda dimasukkan ke form agar tidak hilang dan dapat diedit secara manual."
            });
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
}