using AIPersonalAssistant.Models;

namespace AIPersonalAssistant.Services;

public interface ITokenService
{
    string CreateToken(User user);
}
