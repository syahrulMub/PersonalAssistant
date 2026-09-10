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
    public async Task<IActionResult> GetActivities([FromQuery] int page = 1, [FromQuery] int pageSize = 5)
    {
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

        return Ok(result);
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
            IsReminder = activity.IsReminder
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
