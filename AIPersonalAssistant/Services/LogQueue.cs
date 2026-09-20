using System.Threading.Channels;

namespace AIPersonalAssistant.Services;

public interface ILogQueue
{
    void QueueLog(LogEntry log);
    IAsyncEnumerable<LogEntry> ReadAllAsync(CancellationToken cancellationToken = default);
}

public class LogQueue : ILogQueue
{
    // Channel bounded untuk mencegah memory bloat jika disk macet
    private readonly Channel<LogEntry> _channel = Channel.CreateBounded<LogEntry>(new BoundedChannelOptions(10000)
    {
        FullMode = BoundedChannelFullMode.DropOldest // Jika antrean penuh, buang log tertua
    });

    public void QueueLog(LogEntry log) => _channel.Writer.TryWrite(log);

    public IAsyncEnumerable<LogEntry> ReadAllAsync(CancellationToken cancellationToken = default)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}

public record LogEntry(
    DateTimeOffset Timestamp,
    string Level,
    string Message,
    string? Controller = null,
    string? Action = null,
    string? ClientIp = null,
    string? Details = null
);