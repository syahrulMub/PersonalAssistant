using AIPersonalAssistant.DTOs.TracebackMemory;

namespace AIPersonalAssistant.Services.Interface;

public interface IAIMemoryService
{
    Task ProcessDailyMemoriesAsync(int userId);
    Task CorrectionMemoryAskAI(int userId, List<MemoryMutationDto> memoryMutationDtos);
}
