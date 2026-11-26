using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Foccus.Agent;

public sealed class EnrollResponse
{
    [JsonPropertyName("device_id")] public string DeviceId { get; set; } = "";
    [JsonPropertyName("device_key")] public string DeviceKey { get; set; } = "";
    [JsonPropertyName("policy")] public Policy Policy { get; set; } = new();
}

public sealed class IngestResponse
{
    [JsonPropertyName("accepted")] public int Accepted { get; set; }
    [JsonPropertyName("rejected")] public int Rejected { get; set; }
    [JsonPropertyName("policy")] public Policy? Policy { get; set; }
}

public sealed class UnauthorizedException : Exception { }

public static class ApiClient
{
    public const string Version = "0.2.0";
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };

    public static string NormalizeUrl(string url)
    {
        url = url.Trim().TrimEnd('/');
        if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
            !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) url = "https://" + url;
        return url;
    }

    public static async Task<EnrollResponse> EnrollAsync(string server, string token)
    {
        var res = await Http.PostAsJsonAsync($"{NormalizeUrl(server)}/api/agent/enroll", new
        {
            token = token.Trim(),
            hostname = Environment.MachineName,
            windows_user = Environment.UserName,
            agent_version = Version,
        });
        if (res.StatusCode == HttpStatusCode.Unauthorized) throw new InvalidOperationException("Token inválido ou expirado.");
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<EnrollResponse>())!;
    }

    public static async Task<IngestResponse> IngestAsync(string server, string deviceKey, IReadOnlyList<UsageSession> sessions)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{server}/api/agent/ingest")
        {
            Content = JsonContent.Create(new
            {
                agent_version = Version,
                windows_user = Environment.UserName,
                sessions,
            }),
        };
        req.Headers.Authorization = new("Bearer", deviceKey);
        var res = await Http.SendAsync(req);
        if (res.StatusCode == HttpStatusCode.Unauthorized) throw new UnauthorizedException();
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<IngestResponse>())!;
    }
}
