using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.Models;

namespace AIPersonalAssistant.Services;

public class AiRecapService
{
    private readonly AppDbContext _dbContext;

    public AiRecapService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AIRecap> SaveRecapAsync(DailySummaryAiDto dailySummaryAiDto)
    {

        var recap = new AIRecap
        {
            CreatedAt = DateTime.UtcNow,
            SummaryText = dailySummaryAiDto.SummaryText,
            PositiveAffirmations = dailySummaryAiDto.PositiveAffirmations,
            ActionableInsights = dailySummaryAiDto.ActionableInsights,
            EmailSendAt = DateTime.UtcNow.AddHours(1),
            IsEmailSent = false
        };

        _dbContext.AIRecaps.Add(recap);
        await _dbContext.SaveChangesAsync();

        return recap;
    }
}