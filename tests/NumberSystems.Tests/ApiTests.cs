using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace NumberSystems.Tests;

public class ApiTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task To_decimal_returns_terms()
    {
        var json = await _client.GetFromJsonAsync<JsonElement>("/api/to-decimal?number=1A3&radix=16");

        Assert.Equal(419, json.GetProperty("value").GetInt32());
        Assert.Equal(3, json.GetProperty("terms").GetArrayLength());
    }

    [Fact]
    public async Task Invalid_digit_is_bad_request_with_code_and_position()
    {
        var response = await _client.GetAsync("/api/to-decimal?number=128&radix=2");
        var error = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("InvalidDigit", error.GetProperty("code").GetString());
        Assert.Equal(1, error.GetProperty("position").GetInt32());
    }

    [Fact]
    public async Task Check_accepts_enum_as_string()
    {
        var response = await _client.PostAsJsonAsync("/api/check",
            new { kind = "NextRemainder", number = "419", radix = 16, index = 1, answer = "A" });
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.True(json.GetProperty("correct").GetBoolean());
    }

    [Fact]
    public async Task Serves_front_end()
    {
        var html = await _client.GetStringAsync("/");

        Assert.Contains("<title>", html);
    }
}
