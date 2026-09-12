using System.Security.Claims;

namespace AIPersonalAssistant.Extension;

public static class ClaimPricipleExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var id = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(id, out var parsedId) ? parsedId : 0;
    }

    public static string GetEmail(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
    }

    public static string GetFullName(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
    }
}
