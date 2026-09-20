using System.Text;

namespace AIPersonalAssistant.Services;

public class LogQueueBackgroundWorker : BackgroundService
{
    private readonly ILogQueue _logQueue;
    private readonly string _logsDirectory;
    private readonly ILogger<LogQueueBackgroundWorker> _logger;

    public LogQueueBackgroundWorker(
        ILogQueue logQueue,
        IWebHostEnvironment env,
        ILogger<LogQueueBackgroundWorker> logger)
    {
        _logQueue = logQueue;
        _logsDirectory = Path.Combine(env.ContentRootPath, "Logs");
        _logger = logger;
        Directory.CreateDirectory(_logsDirectory);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("LogQueueBackgroundWorker started. Listening for log entries...");

        try
        {
            await foreach (var log in _logQueue.ReadAllAsync(stoppingToken))
            {
                try
                {
                    var date = log.Timestamp.ToString("yyyy-MM-dd");
                    var logFilePath = Path.Combine(_logsDirectory, $"api-{date}.log");

                    // Format baris log standar 7 kolom:
                    // timestamp:O | level | controller | action | clientIp | message | details
                    var logLine = $"{log.Timestamp:O} | {log.Level} | {log.Controller ?? "-"} | {log.Action ?? "-"} | {log.ClientIp ?? "-"} | {log.Message} | {log.Details ?? string.Empty}";

                    await File.AppendAllTextAsync(logFilePath, logLine + Environment.NewLine, Encoding.UTF8, stoppingToken);
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Failed to write log entry to disk in LogQueueBackgroundWorker.");
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Graceful shutdown
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in LogQueueBackgroundWorker.");
        }
    }
}

