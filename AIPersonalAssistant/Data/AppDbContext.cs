using Microsoft.EntityFrameworkCore;
using AIPersonalAssistant.Models;
namespace AIPersonalAssistant.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<ActivityLogs> ActivityLogs { get; set; }
    public DbSet<AIRecap> AIRecaps { get; set; }
}
