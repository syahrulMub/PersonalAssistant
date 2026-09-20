using System.Threading.Channels;

public interface ILogQueue
{
    void QueueLog(LogEntry log);
    IAsyncEnumerable<LogEntry> ReadAllAsync(CancellationToken cancellationToken = default);
}

public class LogQueue : ILogQueue
{
    // Channel bounded untuk mencegah RAM bocor jika disk macet
    private readonly Channel<LogEntry> _channel = Channel.CreateBounded<LogEntry>(new BoundedChannelOptions(10000)
    {
        FullMode = BoundedChannelFullMode.DropOldest // Jika antrean penuh, buang log tertua
    });

    public void QueueLog(LogEntry log) => _channel.Writer.TryWrite(log);

    public IAsyncEnumerable<LogEntry> ReadAllAsync(CancellationToken cancellationToken = default)
        => _channel.Reader.ReadAllAsync(cancellationToken);
}

public record LogEntry(string Level, string Message, string Details, DateTime Timestamp);