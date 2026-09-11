using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ActivityController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ActivityController> _logger;

    public ActivityController(AppDbContext dbContext, ILogger<ActivityController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivities([FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
        try
        {
            _logger.LogInformation("ActivityController.GetActivities called. page={Page}, pageSize={PageSize}", page, pageSize);

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 5;
            if (pageSize > 100) pageSize = 100;

            var totalCount = await _dbContext.ActivityLogs.CountAsync();

            var items = await _dbContext.ActivityLogs
                .OrderByDescending(a => a.CreateAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new ActivityResponseDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Description = a.Description,
                    Category = a.Category,
                    CreatedAt = a.CreateAt,
                    IsReviewed = a.IsCompleted,
                    RemindAt = a.ReminderTime,
                    IsReminder = a.IsReminder
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
            _logger.LogInformation("ActivityController.GetActivity called. id={Id}", id);

            var activity = await _dbContext.ActivityLogs.FindAsync(id);
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
                CreatedAt = activity.CreateAt,
                IsReviewed = activity.IsCompleted,
                RemindAt = activity.ReminderTime,
                IsReminder = activity.IsReminder
            };

            _logger.LogInformation("ActivityController.GetActivity completed. id={Id}", id);
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

            _logger.LogInformation("ActivityController.CreateActivity called. Title={Title}", createActivityDto.Title);

            if (!ModelState.IsValid)
            {
                _logger.LogWarning("ActivityController.CreateActivity validation failed.");
                return BadRequest(ModelState);
            }

            var activity = new Models.ActivityLogs
            {
                Title = createActivityDto.Title,
                Description = createActivityDto.Description,
                Category = createActivityDto.Category,
                IsReminder = createActivityDto.IsReminder,
                ReminderTime = createActivityDto.RemindAt ?? DateTime.MinValue,
                CreateAt = DateTime.UtcNow,
                IsCompleted = false
            };

            _dbContext.ActivityLogs.Add(activity);
            await _dbContext.SaveChangesAsync();

            var activityResponseDto = new ActivityResponseDto
            {
                Id = activity.Id,
                Title = activity.Title,
                Description = activity.Description,
                Category = activity.Category,
                CreatedAt = activity.CreateAt,
                IsReviewed = activity.IsCompleted,
                RemindAt = activity.ReminderTime,
                IsReminder = activity.IsReminder
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
            _logger.LogInformation("ActivityController.DeleteActivity called. id={Id}", id);

            var activity = await _dbContext.ActivityLogs.FindAsync(id);
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
}
