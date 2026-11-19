using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Foccus.Agent;

public sealed class Policy
{
    [JsonPropertyName("collect_window_titles")] public bool CollectWindowTitles { get; set; }
    [JsonPropertyName("idle_threshold_seconds")] public int IdleThresholdSeconds { get; set; } = 300;
    [JsonPropertyName("flush_interval_seconds")] public int FlushIntervalSeconds { get; set; } = 60;
}

public sealed class AgentConfig
{
    public string ServerUrl { get; set; } = "";
    public string DeviceId { get; set; } = "";
    /// <summary>Chave do dispositivo protegida com DPAPI (somente este usuário Windows consegue ler).</summary>
    public string DeviceKeyProtected { get; set; } = "";
    public Policy Policy { get; set; } = new();

    [JsonIgnore] public bool IsEnrolled => ServerUrl != "" && DeviceKeyProtected != "";

    public static string Dir => Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Foccus");
    private static string FilePath => Path.Combine(Dir, "config.json");

    public static AgentConfig Load()
    {
        try
        {
            if (File.Exists(FilePath))
                return JsonSerializer.Deserialize<AgentConfig>(File.ReadAllText(FilePath)) ?? new();
        }
        catch (Exception e) { Log.Write("config inválido: " + e.Message); }
        return new();
    }

    public void Save()
    {
        Directory.CreateDirectory(Dir);
        var tmp = FilePath + ".tmp";
        File.WriteAllText(tmp, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
        File.Move(tmp, FilePath, overwrite: true);
    }

    public void SetDeviceKey(string key) =>
        DeviceKeyProtected = Convert.ToBase64String(
            ProtectedData.Protect(Encoding.UTF8.GetBytes(key), null, DataProtectionScope.CurrentUser));

    public string? GetDeviceKey()
    {
        try
        {
            return Encoding.UTF8.GetString(
                ProtectedData.Unprotect(Convert.FromBase64String(DeviceKeyProtected), null, DataProtectionScope.CurrentUser));
        }
        catch { return null; }
    }
}

internal static class Log
{
    private static readonly object L = new();
    public static void Write(string msg)
    {
        try
        {
            lock (L)
            {
                Directory.CreateDirectory(AgentConfig.Dir);
                var p = Path.Combine(AgentConfig.Dir, "agent.log");
                if (File.Exists(p) && new FileInfo(p).Length > 1_000_000) File.Move(p, p + ".old", true);
                File.AppendAllText(p, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} {msg}{Environment.NewLine}");
            }
        }
        catch { /* log nunca derruba o agente */ }
    }
}
