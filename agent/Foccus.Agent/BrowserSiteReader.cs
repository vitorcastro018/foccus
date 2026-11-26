using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

namespace Foccus.Agent;

/// <summary>
/// Acompanha a GUIA ativa do navegador em foco (Chrome, Edge, Brave…) lendo a barra de endereços via
/// UI Automation. Sem extensão. Guarda SOMENTE o host (ex.: "github.com"); caminho, query e título
/// nunca saem desta classe. Cada troca de guia/navegação muda o site e o Collector abre nova sessão.
/// O elemento da barra fica em cache, então ler a cada segundo é barato; a busca na árvore (cara)
/// só acontece quando a janela muda ou a leitura falha.
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
    private IntPtr _hwnd; private AutomationElement? _addressBar;
    private int _failures;

    public BrowserSiteReader(Func<Policy> policy)
    {
        _policy = policy;
        _thread = new Thread(Loop) { IsBackground = true, Name = "site-reader" };
        _thread.SetApartmentState(ApartmentState.MTA);
        _thread.Start();
    }

    public static bool IsBrowser(string process) => Browsers.Contains(process);

    /// <summary>Site da guia ativa se o app em foco é navegador e a leitura é recente; senão null.</summary>
    public string? Current(string process)
    {
        if (!IsBrowser(process)) return null;
        var at = new DateTime(Interlocked.Read(ref _atTicks), DateTimeKind.Utc);
        return (DateTime.UtcNow - at).TotalSeconds < 5 ? _site : null;
    }

    private void Loop()
    {
        UIA3Automation? automation = null;
        while (!_stop)
        {
            try
            {
                Thread.Sleep(1000);
                if (!_policy().CollectSites) { _site = null; _addressBar = null; continue; }

                var fg = Native.Foreground();
                if (fg is null || !IsBrowser(fg.Value.Process)) { _site = null; continue; }

                var hwnd = Native.ForegroundHandle();
                automation ??= new UIA3Automation();

                if (hwnd != _hwnd) { _hwnd = hwnd; _addressBar = null; }

                // 1) leitura barata no elemento em cache; 2) se falhar, procura de novo na árvore
                var read = TryRead(_addressBar, out var value);
                if (!read)
                {
                    _addressBar = FindAddressBar(automation, hwnd, out value);
                    read = _addressBar != null;
                }

                if (read)
                {
                    var host = SiteParser.ParseHost(value);
                    // Sem host: página especial (chrome://, about:, nova guia) → sem site.
                    // Texto solto sem esquema = usuário digitando na barra → mantém o site anterior.
                    var typing = host is null && !string.IsNullOrEmpty(value) && !value.Contains("://") && !value.StartsWith("about:");
                    if (!typing) _site = host;
                    if (host != null) _failures = 0;
                    Interlocked.Exchange(ref _atTicks, DateTime.UtcNow.Ticks);
                }
                else
                {
                    _site = null;
                    if (++_failures <= 3) Log.Write($"site: não foi possível ler a barra de endereços ({fg.Value.Process})");
                }
            }
            catch (Exception e)
            {
                if (++_failures <= 3) Log.Write("site: " + e.Message);
                _addressBar = null;
                try { automation?.Dispose(); } catch { }
                automation = null;
            }
        }
        try { automation?.Dispose(); } catch { }
    }

    private static bool TryRead(AutomationElement? el, out string? value)
    {
        value = null;
        if (el is null) return false;
        try
        {
            value = el.Patterns.Value.PatternOrDefault?.Value.ValueOrDefault;
            return true;
        }
        catch { return false; }  // elemento morreu (janela/guia recriada)
    }

    private static AutomationElement? FindAddressBar(UIA3Automation automation, IntPtr hwnd, out string? value)
    {
        value = null;
        var win = automation.FromHandle(hwnd);
        if (win is null) return null;
        // Os nomes da barra de endereços variam por idioma; testamos os campos de edição e
        // ficamos com o primeiro cujo valor parece um endereço (host com ponto ou localhost).
        foreach (var edit in win.FindAllDescendants(cf => cf.ByControlType(ControlType.Edit)))
        {
            string? v = null;
            try { v = edit.Patterns.Value.PatternOrDefault?.Value.ValueOrDefault; } catch { }
            if (SiteParser.ParseHost(v) != null) { value = v; return edit; }
        }
        return null;
    }

    public void Dispose() { _stop = true; }
}
