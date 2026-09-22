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
            CreatedAt = DateTime.Now,
            SummaryText = dailySummaryAiDto.SummaryText,
            PositiveAffirmations = dailySummaryAiDto.PositiveAffirmations,
            ActionableInsights = dailySummaryAiDto.ActionableInsights,
            EmailSendAt = DateTime.Now.AddHours(1),
            IsEmailSent = false
        };

        _dbContext.AIRecaps.Add(recap);
        await _dbContext.SaveChangesAsync();

        return recap;
    }
    public async Task<AIDailySummary> SaveRecapJsonAsync(string contentJson, int userId)
    {

        var recap = new AIDailySummary
        {
            CreatedAt = DateTime.Now,
            SummaryType = "MorningBriefing",
            ContentJson = contentJson,
            BriefingDate = DateTime.Now.Date.ToString("dd - MMM - yyyy"),
            IsEmailSent = false,
            UserId = userId
        };

        _dbContext.AIDailySummaries.Add(recap);
        await _dbContext.SaveChangesAsync();

        return recap;
    }
}