using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Routing;

namespace AIPersonalAssistant.Middleware;

public class ApiRequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ApiLogService _apiLogService;

    public ApiRequestLoggingMiddleware(RequestDelegate next, ApiLogService apiLogService)
    {
        _next = next;
        _apiLogService = apiLogService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var method = context.Request.Method;
        var path = $"{context.Request.Path}{context.Request.QueryString}";
        var routeData = context.GetRouteData();
        var controller = routeData?.Values["controller"]?.ToString();
        var action = routeData?.Values["action"]?.ToString();
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "-";

        try
        {
            await _next(context);
            _apiLogService.LogAccess(method, path, context.Response.StatusCode, controller, action, clientIp);
        }
        catch (Exception ex)
        {
            _apiLogService.LogError(ex, method, path, controller, action, clientIp);
            throw;
        }
    }
}
