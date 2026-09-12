using Microsoft.AspNetCore.Hosting;
using System.Text.RegularExpressions;

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
        var safeEndpoint = SanitizeEndpoint(endpoint);
        var detail = $"Provider={provider} Endpoint={safeEndpoint} Method={method} StatusCode={(statusCode?.ToString() ?? "-")} Request={requestBody ?? "-"} Response={responseBody ?? "-"}";
        WriteLog("THIRD_PARTY", message, controller ?? provider, action ?? "GenerateContentAsync", clientIp, detail);
    }

    private string SanitizeEndpoint(string endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return endpoint;
        }

        var sanitized = Regex.Replace(endpoint, @"([?&])key=[^&]+", "$1key=***REDACTED***", RegexOptions.IgnoreCase);
        return sanitized;
    }

    private void WriteLog(string level, string message, string? controller = null, string? action = null, string? clientIp = null, string? details = null)
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var logFilePath = Path.Combine(_logsDirectory, $"api-{date}.log");
        var logLine = $"{DateTimeOffset.UtcNow:O} | {level} | {controller ?? "-"} | {action ?? "-"} | {clientIp ?? "-"} | {message} | {details ?? string.Empty}";

        File.AppendAllText(logFilePath, logLine + Environment.NewLine);
    }

    public int GetLogCount(string? date = null)
    {
        var targetDate = string.IsNullOrWhiteSpace(date)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : date;

        var logFilePath = Path.Combine(_logsDirectory, $"api-{targetDate}.log");
        if (!File.Exists(logFilePath))
        {
            return 0;
        }

        return File.ReadLines(logFilePath).Count(line => !string.IsNullOrWhiteSpace(line));
    }

    public IReadOnlyList<string> ReadLogs(int page = 1, int pageSize = 100, string? date = null)
    {
        var targetDate = string.IsNullOrWhiteSpace(date)
            ? DateTime.UtcNow.ToString("yyyy-MM-dd")
            : date;

        var logFilePath = Path.Combine(_logsDirectory, $"api-{targetDate}.log");
        if (!File.Exists(logFilePath))
        {
            return Array.Empty<string>();
        }

        var lines = File.ReadLines(logFilePath)
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => new
            {
                Line = line,
                Timestamp = TryParseTimestamp(line)
            })
            .OrderByDescending(x => x.Timestamp)
            .Skip((Math.Max(page, 1) - 1) * Math.Max(pageSize, 1))
            .Take(Math.Max(pageSize, 1))
            .Select(x => x.Line)
            .ToList();

        return lines;
    }

    private static DateTimeOffset TryParseTimestamp(string line)
    {
        var firstPipe = line.IndexOf('|');
        if (firstPipe < 0)
        {
            return DateTimeOffset.MinValue;
        }

        var timestampPart = line.Substring(0, firstPipe).Trim();
        if (DateTimeOffset.TryParse(timestampPart, out var parsed))
        {
            return parsed;
        }

        return DateTimeOffset.MinValue;
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
