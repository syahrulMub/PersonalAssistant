namespace AIPersonalAssistant.Services.Interface;

public interface IAIMemoryService
{
    Task ProcessDailyMemoriesAsync(int userId);
}
