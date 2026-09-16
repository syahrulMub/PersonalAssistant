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
    public DbSet<AIFeature> AIFeatures { get; set; }
    public DbSet<UserAIFeature> UserAIFeatures { get; set; }
    public DbSet<AIMemory> AIMemories { get; set; }
    public DbSet<AIMemoryObservation> AIMemoryObservations { get; set; }
    public DbSet<UserReflection> UserReflections { get; set; }

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

        #region  Konfigurasi Pivot Table AI Memory
        modelBuilder.Entity<UserAIFeature>()
            .HasKey(uf => new { uf.UserId, uf.FeatureId });

        modelBuilder.Entity<UserAIFeature>()
            .HasOne(uf => uf.User)
            .WithMany(u => u.UserAIFeatures)
            .HasForeignKey(uf => uf.UserId);

        modelBuilder.Entity<UserAIFeature>()
            .HasOne(uf => uf.AIFeature)
            .WithMany(f => f.UserAIFeatures)
            .HasForeignKey(uf => uf.FeatureId);

        modelBuilder.Entity<AIMemory>(entity =>
        {
            entity.ToTable("AIMemories");

            entity.HasKey(m => m.Id);
            entity.HasOne(m => m.user)
                  .WithMany()
                  .HasForeignKey(m => m.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(m => m.Observations)
                  .WithOne(o => o.AIMemory)
                  .HasForeignKey(o => o.AIMemoryId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(m => new { m.UserId, m.Status });
            entity.HasIndex(m => new { m.UserId, m.Key });
            entity.HasIndex(m => new { m.UserId, m.Subject });
        });
        #endregion

        # region Konfigurasi AIMemoryObservation
        modelBuilder.Entity<AIMemoryObservation>(entity =>
        {
            entity.ToTable("AIMemoryObservations");

            entity.HasKey(o => o.Id);

            // Relasi: User 1 -> Many AIMemoryObservation
            // Gunakan Restrict agar tidak terjadi konflik multiple cascade paths di EF Core
            entity.HasOne(o => o.User)
                  .WithMany()
                  .HasForeignKey(o => o.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Indeks untuk relasi FK
            entity.HasIndex(o => o.AIMemoryId);
            entity.HasIndex(o => o.UserId);
        });
        #endregion
    }

}
