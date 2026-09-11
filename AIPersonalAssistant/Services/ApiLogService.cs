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

    public void LogEmail(string message, string? subject = null, string? recipient = null, string? controller = null, string? action = null, string? clientIp = null)
    {
        var detail = $"Subject={subject ?? "-"} Recipient={recipient ?? "-"}";
        WriteLog("EMAIL", message, controller ?? "EmailService", action ?? "SendEmailAsync", clientIp, detail);
    }

    public void LogEmailError(Exception ex, string? subject = null, string? recipient = null, string? controller = null, string? action = null, string? clientIp = null)
    {
        var detail = $"Subject={subject ?? "-"} Recipient={recipient ?? "-"} Exception={ex}";
        WriteLog("ERROR", "Email sending failed.", controller ?? "EmailService", action ?? "SendEmailAsync", clientIp, detail);
    }

    public void LogThirdParty(string provider, string endpoint, string method, int? statusCode, string message, string? requestBody = null, string? responseBody = null, string? controller = null, string? action = null, string? clientIp = null)
    {
        var detail = $"Provider={provider} Endpoint={endpoint} Method={method} StatusCode={(statusCode?.ToString() ?? "-")} Request={requestBody ?? "-"} Response={responseBody ?? "-"}";
        WriteLog("THIRD_PARTY", message, controller ?? provider, action ?? "GenerateContentAsync", clientIp, detail);
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

        var dates = Directory.GetFiles(_logsDirectory, "api-*.log")
            .Select(Path.GetFileNameWithoutExtension)
            .Select(name => name?.Replace("api-", ""))
            .Where(date => !string.IsNullOrWhiteSpace(date))
            .Select(date => date!)
            .OrderByDescending(date => date)
            .ToList();

        return dates;
    }
}
