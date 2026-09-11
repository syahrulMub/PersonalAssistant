using Hangfire.Dashboard;

namespace AIPersonalAssistant;

public class HangfireDashboardNoAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        return true;
    }
}