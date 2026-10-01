using System.Text.Json;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.Models;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Services;

public class DashboardService
{

    private readonly AppDbContext _dbContext;
    private readonly AIGeminiService _aiService;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(AppDbContext dbContext, AIGeminiService aiService, ILogger<DashboardService> logger)
    {
        _dbContext = dbContext;
        _aiService = aiService;
        _logger = logger;
    }

    public async Task<DashboardSummaryDto> GetSummaryDashboard(int userId)
    {
        try
        {
            var dashbaordResult = await _dbContext.DasboardSnapshots.Where(x => x.UserId == userId)
                .OrderByDescending(x => x.GeneratedAt).FirstOrDefaultAsync();

            if (dashbaordResult == null)
            {
                return new DashboardSummaryDto();
            }

            var formatDashboard = JsonSerializer.Deserialize<DashboardSummaryDto>(dashbaordResult.PayloadJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new DashboardSummaryDto();

            formatDashboard.GeneratedAt = dashbaordResult.GeneratedAt;
            return formatDashboard;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Gagal memproses data dashboard summary untuk userId {UserId}.", userId);
            throw;
        }
    }
    public async Task GenerateSummaryFromAI()
    {
        var users = await _dbContext.Users.ToListAsync();
        foreach (var user in users)
        {
            var cutoff = DateTime.Now.AddDays(-7);
            var recentLogs = await _dbContext.ActivityLogs
                .AsNoTracking()
                .Where(a => a.UserId == user.Id && a.CreateAt >= cutoff)
                .Select(a => new
                {
                    a.Title,
                    a.Description,
                    a.Note
                })
                .ToListAsync();
            var recentLogsJson = JsonSerializer.Serialize(recentLogs);

            // 3. Domain aktif langsung dari AIMemories
            var activeDomains = await _dbContext.AIMemories
                .AsNoTracking()
                .Where(m => m.UserId == user.Id && m.Status == "Active" && m.UpdatedAt >= cutoff)
                .Select(m => m.Subject)
                .Distinct()
                .ToListAsync();

            var activeDomainsJson = JsonSerializer.Serialize(activeDomains);

            var askAIHistory = await _dbContext.TracebackMemories
                .AsNoTracking()
                .Where(m => m.UserId == user.Id && m.UpdatedAt >= cutoff)
                .OrderByDescending(m => m.CurrentTurn)
                .Take(10)
                .Select(m => m.ConversationHistoryJson)
                .ToListAsync();

            var askAIHistoryJson = JsonSerializer.Serialize(askAIHistory);

            var promptDashboard = AIprompt.DashboardCompilerPrompt(recentLogsJson, activeDomainsJson, askAIHistoryJson);
            try
            {
                var jsonResult = await _aiService.ExecuteGeminiJsonApi(promptDashboard, "ApiKeyAIMemoryCompiler");
                //Console.WriteLine(jsonResult);
                var dashboardDto = JsonSerializer.Deserialize<DashboardSummaryDto>(jsonResult, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? throw new InvalidOperationException("Format payload AI tidak valid atau kosong.");

                var snapshot = new DasboardSnapshot
                {
                    UserId = user.Id,
                    GeneratedAt = DateTime.Now,
                    PayloadJson = jsonResult
                };
                _dbContext.DasboardSnapshots.Add(snapshot);
                await _dbContext.SaveChangesAsync();

            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gagal memproses transaksi refleksi.");
                throw;
            }
        }

    }
}
