using System.Text.Json;
using System.Text.Json.Serialization;

namespace AIPersonalAssistant.DTOs.TracebackMemory;

public class MemoryPatchResultDto
{
    public string Action { get; set; } = "UPDATE";
    public string Key { get; set; } = string.Empty;
    public int TargetMemoryId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;

    [JsonConverter(typeof(StringOrObjectJsonConverter))]
    public string UpdatedValueJson { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
}

public class StringOrObjectJsonConverter : JsonConverter<string>
{
    public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            return reader.GetString() ?? string.Empty;
        }

        using var doc = JsonDocument.ParseValue(ref reader);
        return doc.RootElement.GetRawText();
    }

    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value);
    }
}