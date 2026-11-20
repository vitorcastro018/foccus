using System.Text.Json.Serialization;

namespace Foccus.Agent;

public sealed class UsageSession
{
    [JsonPropertyName("process_name")] public string ProcessName { get; set; } = "";
    [JsonPropertyName("window_title")] public string? WindowTitle { get; set; }
    /// <summary>Domínio do site em foco quando o app é um navegador (somente host, nunca URL completa).</summary>
    [JsonPropertyName("site")] public string? Site { get; set; }
    [JsonPropertyName("started_at")] public DateTime StartedAt { get; set; }
    [JsonPropertyName("ended_at")] public DateTime EndedAt { get; set; }
    [JsonPropertyName("active_seconds")] public int ActiveSeconds { get; set; }
    [JsonPropertyName("idle_seconds")] public int IdleSeconds { get; set; }
}

/// <summary>
/// Chamado a cada ~1s. Agrupa o tempo em sessões por aplicativo em foco,
/// separando segundos ativos de ociosos (sem input além do limite da política).
/// </summary>
public sealed class Collector
{
    private const int MaxSessionSeconds = 300;   // fecha a sessão a cada 5 min para não perder dados em caso de falha
    private const double MaxGapSeconds = 10;     // intervalo maior = máquina suspensa/travada; não conta

    private readonly Func<Policy> _policy;
    private readonly Action<UsageSession> _emit;
    private readonly Func<string, string?> _site;
    private UsageSession? _cur;
    private DateTime _lastTick = DateTime.UtcNow;
    private double _active, _idle;

    public Collector(Func<Policy> policy, Action<UsageSession> emit, Func<string, string?> site)
    { _policy = policy; _emit = emit; _site = site; }

    public void Tick()
    {
        var now = DateTime.UtcNow;
        var dt = (now - _lastTick).TotalSeconds;
        _lastTick = now;

        if (dt > MaxGapSeconds) { Close(now - TimeSpan.FromSeconds(dt)); dt = 0; }

        var fg = Native.Foreground();
        var policy = _policy();
        var locked = fg is null || fg.Value.Process.Equals("LockApp.exe", StringComparison.OrdinalIgnoreCase)
                                || fg.Value.Process.Equals("LogonUI.exe", StringComparison.OrdinalIgnoreCase);
        if (locked) { Close(now); return; }

        var (proc, title) = fg!.Value;
        var site = policy.CollectSites ? _site(proc) : null;
        if (_cur is null || !_cur.ProcessName.Equals(proc, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(_cur.Site, site, StringComparison.OrdinalIgnoreCase) ||
            (now - _cur.StartedAt).TotalSeconds >= MaxSessionSeconds)
        {
            Close(now);
            _cur = new UsageSession
            {
                ProcessName = proc,
                WindowTitle = policy.CollectWindowTitles ? title : null,
                Site = site,
                StartedAt = now,
            };
        }

        if (Native.IdleSeconds() >= policy.IdleThresholdSeconds) _idle += dt; else _active += dt;
    }

    public void Flush() => Close(DateTime.UtcNow);

    private void Close(DateTime end)
    {
        if (_cur is not null)
        {
            _cur.EndedAt = end < _cur.StartedAt ? _cur.StartedAt : end;
            _cur.ActiveSeconds = (int)Math.Round(_active);
            _cur.IdleSeconds = (int)Math.Round(_idle);
            if (_cur.ActiveSeconds + _cur.IdleSeconds > 0) _emit(_cur);
        }
        _cur = null; _active = 0; _idle = 0;
    }
}
