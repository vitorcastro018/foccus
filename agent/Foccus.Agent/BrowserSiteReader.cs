using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

namespace Foccus.Agent;

/// <summary>
/// Descobre o domínio do site na guia ativa lendo a barra de endereços do navegador em foco
/// (UI Automation). Sem extensão. Guarda SOMENTE o host (ex.: "github.com"); caminho, query e
/// título nunca saem desta classe. Melhor esforço: depende de o navegador expor a barra via UIA.
/// </summary>
public sealed class BrowserSiteReader : IDisposable
{
    private static readonly HashSet<string> Browsers = new(StringComparer.OrdinalIgnoreCase)
    { "chrome.exe", "msedge.exe", "brave.exe", "opera.exe", "vivaldi.exe", "firefox.exe" };

    private readonly Func<Policy> _policy;
    private readonly Thread _thread;
    private volatile bool _stop;
    private volatile string? _site;
    private long _atTicks;                   // quando _site foi confirmado (UTC ticks)
    private IntPtr _lastHwnd; private string _lastTitle = ""; private DateTime _lastRead = DateTime.MinValue;
    private int _failures;

    public BrowserSiteReader(Func<Policy> policy)
    {
        _policy = policy;
        _thread = new Thread(Loop) { IsBackground = true, Name = "site-reader" };
        _thread.SetApartmentState(ApartmentState.MTA);
        _thread.Start();
    }

    public static bool IsBrowser(string process) => Browsers.Contains(process);

    /// <summary>Site atual se o app em foco é navegador e a leitura é recente; senão null.</summary>
    public string? Current(string process)
    {
        if (!IsBrowser(process)) return null;
        var at = new DateTime(Interlocked.Read(ref _atTicks), DateTimeKind.Utc);
        return (DateTime.UtcNow - at).TotalSeconds < 15 ? _site : null;
    }

    private void Loop()
    {
        UIA3Automation? automation = null;
        while (!_stop)
        {
            try
            {
                Thread.Sleep(1500);
                if (!_policy().CollectSites) { _site = null; continue; }

                var fg = Native.Foreground();
                if (fg is null || !IsBrowser(fg.Value.Process)) { _site = null; continue; }

                var hwnd = Native.ForegroundHandle();
                var title = fg.Value.Title;
                var unchanged = hwnd == _lastHwnd && title == _lastTitle && (DateTime.UtcNow - _lastRead).TotalSeconds < 30;
                if (unchanged)
                {
                    if (_site != null) Interlocked.Exchange(ref _atTicks, DateTime.UtcNow.Ticks); // ainda é o mesmo
                    continue;
                }

                automation ??= new UIA3Automation();
                var site = ReadAddressBar(automation, hwnd);
                _lastHwnd = hwnd; _lastTitle = title; _lastRead = DateTime.UtcNow;
                _site = site;
                Interlocked.Exchange(ref _atTicks, DateTime.UtcNow.Ticks);
                if (site is null && ++_failures <= 3)
                    Log.Write($"site: não foi possível ler a barra de endereços ({fg.Value.Process})");
                else if (site != null) _failures = 0;
            }
            catch (Exception e)
            {
                if (++_failures <= 3) Log.Write("site: " + e.Message);
                try { automation?.Dispose(); } catch { }
                automation = null;
            }
        }
        try { automation?.Dispose(); } catch { }
    }

    private static string? ReadAddressBar(UIA3Automation automation, IntPtr hwnd)
    {
        var win = automation.FromHandle(hwnd);
        if (win is null) return null;
        // Os nomes da barra de endereços variam por idioma; testamos os campos de edição e
        // ficamos com o primeiro cujo valor parece um endereço (host com ponto ou localhost).
        foreach (var edit in win.FindAllDescendants(cf => cf.ByControlType(ControlType.Edit)))
        {
            string? value = null;
            try { value = edit.Patterns.Value.PatternOrDefault?.Value.ValueOrDefault; } catch { }
            var host = SiteParser.ParseHost(value);
            if (host != null) return host;
        }
        return null;
    }

    public void Dispose() { _stop = true; }
}
