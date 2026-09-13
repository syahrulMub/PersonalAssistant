using Microsoft.Extensions.Options;

namespace AIPersonalAssistant.Data;

public interface IDatabaseContextResolver
{
    string GetConnectionString();
}


public class DatabaseContextResolver : IDatabaseContextResolver
{
    private readonly IHttpContextAccessor _contextAccessor;
    private readonly IConfiguration _configuration;
    public DatabaseContextResolver(IHttpContextAccessor contextAccessor, IConfiguration configuration)
    {
        _contextAccessor = contextAccessor;
        _configuration = configuration;
    }

    public string GetConnectionString()
    {
        var context = _contextAccessor?.HttpContext;
        var isDev = context?.Request?.Headers.TryGetValue("X-Env", out var headerVal) == true
                            && string.Equals(headerVal, "dev", StringComparison.OrdinalIgnoreCase)
                            || context?.Request?.Query.TryGetValue("env", out var queryVal) == true
                            && string.Equals(queryVal, "dev", StringComparison.OrdinalIgnoreCase);

        var key = isDev ? "DevelopmentConnection" : "DefaultConnection";

        var connStr = _configuration.GetConnectionString(key)
                              ?? _configuration[$"ConnectionStrings:{key}"];

        if (string.IsNullOrEmpty(connStr))
        {
            // Fallback default jika konfigurasi tidak terbaca
            return isDev ? "Data Source=PersonalAssistantDev.db" : "Data Source=PersonalAssistant.db";
        }

        return connStr;
    }
}