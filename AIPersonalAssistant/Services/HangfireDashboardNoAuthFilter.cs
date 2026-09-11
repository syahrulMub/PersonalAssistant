using Hangfire.Dashboard;

namespace AIPersonalAssistant;

public class HangfireDashboardNoAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        // Izinkan semua akses (cocok untuk environment lokal / dev)
        return true;
    }
}