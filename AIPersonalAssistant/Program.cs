using AIPersonalAssistant.Configurations;
using AIPersonalAssistant.Data;
using AIPersonalAssistant.EmailServices;
using Microsoft.EntityFrameworkCore;
using AIPersonalAssistant.Services;
using AIPersonalAssistant.Middleware;
using Hangfire;
using Hangfire.Storage.SQLite;
using AIPersonalAssistant;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "AI Personal Assistant API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Masukkan token JWT saja (tanpa 'Bearer '). Contoh: eyJhbGciOi..."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddSingleton<ApiLogService>();

//email configuration
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailSevice, EmailService>();

//service
builder.Services.AddHostedService<BackgroundReminderService>();

//gemini
builder.Services.AddHttpClient<AIGeminiService>();

//hangfire
builder.Services.AddHangfire(configuration => configuration
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSQLiteStorage("Data Source=hangfire.db;"));

builder.Services.AddHangfireServer();

builder.Services.AddScoped<AiRecapService>();
builder.Services.AddScoped<SchedulerMethod>();

//login
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
    };
});



builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});
builder.Services.AddControllersWithViews();

var app = builder.Build();

//auto migrate when deploy
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

//hangfire dashboard
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new HangfireDashboardNoAuthFilter() }
});

RecurringJob.AddOrUpdate<SchedulerMethod>(
    "daily-ai-night-summary",
    job => job.GenerateNightSummaryAsync(),
    "0 21 * * *",
    new RecurringJobOptions
    {
        TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta")
    });

RecurringJob.AddOrUpdate<SchedulerMethod>(
    "daily-ai-mornig-summary",
    job => job.GenerateMorningSummaryAsync(),
    "0 8 * * *",
    new RecurringJobOptions
    {
        TimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta")
    });

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "AI Personal Assistant API v1");
    });
}
else
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseMiddleware<ApiRequestLoggingMiddleware>();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller}/{action=Index}/{id?}");

app.MapFallbackToFile("index.html");

app.Run();
