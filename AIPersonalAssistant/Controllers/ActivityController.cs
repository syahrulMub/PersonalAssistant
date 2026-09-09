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
    public ActivityController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivities([FromQuery] int limit = 20)
    {
        var activities = await _dbContext.ActivityLogs.Take(limit)
        .Select(a => new ActivityResponseDto
        {
            Id = a.Id,
            Title = a.Title,
            Description = a.Description,
            Category = a.Category,
            CreatedAt = a.CreateAt,
            IsReviewed = a.IsCompleted,
            RemindAt = a.ReminderTime,
            IsReminderSent = a.IsReminder
        })
        .ToListAsync();
        return Ok(activities);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetActivity(int id)
    {
        var activity = await _dbContext.ActivityLogs.FindAsync(id);
        if (activity == null)
        {
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
            IsReminderSent = activity.IsReminder
        };

        return Ok(activityDto);
    }

    [HttpPost]
    public async Task<IActionResult> CreateActivity([FromBody] CreateActivityDto createActivityDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var activity = new Models.ActivityLogs
        {
            Title = createActivityDto.Title,
            Description = createActivityDto.Content,
            Category = createActivityDto.Category,
            IsReminder = createActivityDto.RemindAt.HasValue,
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
            IsReminderSent = activity.IsReminder
        };

        return CreatedAtAction(nameof(GetActivity), new { id = activity.Id }, activityResponseDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteActivity(int id)
    {
        var activity = await _dbContext.ActivityLogs.FindAsync(id);
        if (activity == null)
        {
            return NotFound();
        }

        _dbContext.ActivityLogs.Remove(activity);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}
