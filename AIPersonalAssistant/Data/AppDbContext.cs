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
    public DbSet<User> Users { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = 1,
            FullName = "Initial Admin",
            Email = "syahrul.mubarrok4@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            IsApproved = true,
            Role = "Admin",
            CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        modelBuilder.Entity<ActivityLogs>()
        .Property(a => a.UserId)
        .HasDefaultValue(1);

        modelBuilder.Entity<AIRecap>()
        .Property(a => a.UserId)
        .HasDefaultValue(1);

    }

}
