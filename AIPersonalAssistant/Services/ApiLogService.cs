using Microsoft.AspNetCore.Hosting;

namespace AIPersonalAssistant.Services;

public class ApiLogService
{
    private readonly string _logsDirectory;

    public ApiLogService(IWebHostEnvironment env)
    {
        _logsDirectory = Path.Combine(env.ContentRootPath, "Logs");
        Directory.CreateDirectory(_logsDirectory);
    }

    public void LogAccess(string method, string path, int statusCode, string? controller = null, string? action = null, string? clientIp = null)
    {
        WriteLog("ACCESS", $"{method} {path} -> {statusCode}", controller, action, clientIp);
    }

    public void LogError(Exception ex, string? method = null, string? path = null, string? controller = null, string? action = null, string? clientIp = null)
    {
        WriteLog("ERROR", ex.Message, controller, action, clientIp, $"Method={method} Path={path} Exception={ex}");
    }

    public void LogInfo(string message, string? controller = null, string? action = null, string? clientIp = null)
    {
        WriteLog("INFO", message, controller, action, clientIp);
    }

    private void WriteLog(string level, string message, string? controller = null, string? action = null, string? clientIp = null, string? details = null)
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var logFilePath = Path.Combine(_logsDirectory, $"api-{date}.log");
        var logLine = $"{DateTimeOffset.UtcNow:O} | {level} | {controller ?? "-"} | {action ?? "-"} | {clientIp ?? "-"} | {message} | {details ?? string.Empty}";

        File.AppendAllText(logFilePath, logLine + Environment.NewLine);
    }

    public IReadOnlyList<string> ReadLogs(int take = 100, string? date = null)
    {
        var targetDate = string.IsNullOrWhiteSpace(date)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : date;

        var logFilePath = Path.Combine(_logsDirectory, $"api-{targetDate}.log");

        if (!File.Exists(logFilePath))
        {
            return Array.Empty<string>();
        }

        return File.ReadLines(logFilePath)
            .TakeLast(take)
            .ToList();
    }

    public IReadOnlyList<string> GetLogDates()
    {
        if (!Directory.Exists(_logsDirectory))
        {
            return Array.Empty<string>();
        }

        return Directory.GetFiles(_logsDirectory, "api-*.log")
            .Select(Path.GetFileNameWithoutExtension)
            .Select(name => name?.Replace("api-", ""))
            .Where(date => !string.IsNullOrWhiteSpace(date))
            .OrderByDescending(date => date)
            .ToList();
    }
}
