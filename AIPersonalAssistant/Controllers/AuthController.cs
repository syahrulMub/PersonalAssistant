using AIPersonalAssistant.Data;
using AIPersonalAssistant.DTOs;
using AIPersonalAssistant.Models;
using AIPersonalAssistant.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AIPersonalAssistant.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext context, ITokenService tokenService, ILogger<AuthController> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
    }
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest req)
    {
        if (await _context.Users.AnyAsync(u => u.Email == req.Email.ToLower()))
        {
            return BadRequest(new { message = "Email sudah terdaftar." });
        }

        // Hash password menggunakan BCrypt (otomatis menghasilkan salt unik)
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);

        var user = new User
        {
            FullName = req.FullName,
            Email = req.Email.ToLower(),
            PasswordHash = passwordHash,
            IsApproved = false,
            Role = "User"
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        if (!user.IsApproved)
        {
            return Ok(new { message = "Registrasi berhasil! Akun menunggu persetujuan (approval) dari admin." });
        }

        var token = _tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, user.FullName, user.Email, user.Role));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());

        // Verifikasi keberadaan user dan kecocokan password hash
        if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Email atau password salah." });
        }

        // Pengecekan Whitelist
        if (!user.IsApproved)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Akun Anda belum disetujui oleh admin. Hubungi admin untuk aktivasi."
            });
        }

        var token = _tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, user.FullName, user.Email, user.Role));
    }
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetUsers()
    {
        try
        {
            var users = await _context.Users.ToListAsync();
            _logger.LogInformation("success get list of users");
            return Ok(users);
        }
        catch (Exception ex)
        {
            _logger.LogError("error get list user");
            return StatusCode(500, "Error get list user.");
        }

    }

    [Authorize(Roles = "Admin")]
    [HttpPost("approve/{userId}")]
    public async Task<IActionResult> ApproveUser(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound(new { message = "User tidak ditemukan." });

        user.IsApproved = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"User {user.Email} berhasil di-approve." });
    }


}
