using System.Diagnostics;
using System.Drawing.Drawing2D;

namespace Foccus.Agent;

/// <summary>Ícone na bandeja + laço de coleta (1s) + envio periódico. O agente é sempre visível ao usuário.</summary>
public sealed class TrayApp : ApplicationContext
{
    private readonly AgentConfig _cfg;
    private readonly SessionQueue _queue = new();
    private readonly Collector _collector;
    private readonly BrowserSiteReader _sites;
    private readonly InputMonitor _input = new();
    private readonly NotifyIcon _tray;
    private readonly System.Windows.Forms.Timer _tick = new() { Interval = 1000 };
    private readonly ToolStripMenuItem _status = new("Iniciando…") { Enabled = false };
    private readonly ToolStripMenuItem _last = new("Última sincronização: —") { Enabled = false };
    private DateTime _nextFlush = DateTime.UtcNow.AddSeconds(15);
    private int _flushing;
    private bool _authFailed;
    private int _ticks, _pending;

    public TrayApp(AgentConfig cfg)
    {
        _cfg = cfg;
        _sites = new BrowserSiteReader(() => _cfg.Policy);
        _collector = new Collector(() => _cfg.Policy, _queue.Add, _sites.Current,
            IdleSeconds);

        var menu = new ContextMenuStrip();
        var auto = new ToolStripMenuItem("Iniciar com o Windows") { Checked = Autostart.IsEnabled(), CheckOnClick = true };
        auto.CheckedChanged += (_, _) => Autostart.Set(auto.Checked);
        menu.Items.AddRange(new ToolStripItem[]
        {
            _status, _last, new ToolStripSeparator(),
            new ToolStripMenuItem("Sincronizar agora", null, (_, _) => _ = FlushAsync(force: true)),
            new ToolStripMenuItem("Abrir painel", null, (_, _) => OpenDashboard()),
            new ToolStripMenuItem("Abrir pasta de logs", null, (_, _) => Process.Start("explorer.exe", AgentConfig.Dir)),
            auto, new ToolStripSeparator(),
            new ToolStripMenuItem("Sair", null, (_, _) => Exit()),
        });

        _tray = new NotifyIcon { Icon = MakeIcon(), Text = "Foccus — monitorando o uso de aplicativos", ContextMenuStrip = menu, Visible = true };
        _tray.DoubleClick += (_, _) => OpenDashboard();

        _tick.Tick += (_, _) => OnTick();
        _tick.Start();

        if (!Autostart.IsEnabled() && !File.Exists(Path.Combine(AgentConfig.Dir, ".firstrun")))
        {
            Autostart.Set(true); auto.Checked = true;
            Directory.CreateDirectory(AgentConfig.Dir);
            File.WriteAllText(Path.Combine(AgentConfig.Dir, ".firstrun"), DateTime.UtcNow.ToString("O"));
        }
        _tray.ShowBalloonTip(6000, "Foccus ativo",
            "Este computador está sendo monitorado: uso de aplicativos, sites e cliques (só o instante da atividade). Sem captura de teclas ou telas.", ToolTipIcon.Info);
        Log.Write("agente iniciado v" + ApiClient.Version);
    }

    /// <summary>Ociosidade conforme a política: só cliques, ou cliques + teclado (vale a atividade mais recente).</summary>
    private double IdleSeconds()
    {
        var keyboard = _cfg.Policy.IdleMode == "clicks_keyboard";
        _input.UseKeyboard(keyboard);
        if (!_input.MouseActive) return Native.IdleSeconds();   // sem hook: cai para teclado+mouse do Windows
        var idle = _input.ClickIdleSeconds();
        if (keyboard && _input.KeyboardActive) idle = Math.Min(idle, _input.KeyIdleSeconds());
        return idle;
    }

    private void OnTick()
    {
        try { _collector.Tick(); } catch (Exception e) { Log.Write("coleta: " + e.Message); }
        if (DateTime.UtcNow >= _nextFlush) _ = FlushAsync();
        if (_ticks++ % 10 == 0) _pending = _queue.Count; // evita reler a fila a cada segundo
        _status.Text = _authFailed ? "⚠ Chave recusada — reinstale o agente" : $"● Ativo — {_pending} pendente(s)";
    }

    private async Task FlushAsync(bool force = false)
    {
        if (Interlocked.Exchange(ref _flushing, 1) == 1) return;
        try
        {
            if (force) _collector.Flush();
            var key = _cfg.GetDeviceKey();
            if (key is null) { _authFailed = true; return; }

            // envia em lotes até esvaziar a fila (ou falhar)
            do
            {
                var batch = _queue.Peek(500);
                var res = await ApiClient.IngestAsync(_cfg.ServerUrl, key, batch);
                _queue.Drop(batch.Count);
                if (res.Policy != null) { _cfg.Policy = res.Policy; _cfg.Save(); }
                if (res.Rejected > 0) Log.Write($"servidor rejeitou {res.Rejected} sessão(ões)");
                _authFailed = false;
                _last.Text = "Última sincronização: " + DateTime.Now.ToString("HH:mm:ss");
                if (batch.Count < 500) break;
            } while (true);
            _nextFlush = DateTime.UtcNow.AddSeconds(Math.Max(10, _cfg.Policy.FlushIntervalSeconds));
        }
        catch (UnauthorizedException) { _authFailed = true; Log.Write("chave do dispositivo recusada (401)"); _nextFlush = DateTime.UtcNow.AddMinutes(5); }
        catch (Exception e)
        {
            Log.Write("envio falhou: " + e.Message);
            _nextFlush = DateTime.UtcNow.AddSeconds(60); // offline: tenta de novo; dados ficam na fila
        }
        finally { Interlocked.Exchange(ref _flushing, 0); }
    }

    private void OpenDashboard()
    {
        try { Process.Start(new ProcessStartInfo(_cfg.ServerUrl) { UseShellExecute = true }); } catch { }
    }

    private void Exit()
    {
        _tick.Stop();
        _sites.Dispose();
        _input.Dispose();
        _collector.Flush();
        _tray.Visible = false;
        Log.Write("agente encerrado pelo usuário");
        ExitThread();
    }

    /// <summary>Ícone simples (anel roxo) desenhado em código; evita depender de arquivo .ico.</summary>
    private static Icon MakeIcon()
    {
        using var bmp = new Bitmap(32, 32);
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            using var p1 = new Pen(Color.FromArgb(124, 92, 255), 3);
            using var p2 = new Pen(Color.FromArgb(167, 139, 250), 3);
            using var b = new SolidBrush(Color.FromArgb(124, 92, 255));
            g.DrawEllipse(p1, 3, 3, 25, 25);
            g.DrawEllipse(p2, 9, 9, 13, 13);
            g.FillEllipse(b, 13, 13, 5, 5);
        }
        return Icon.FromHandle(bmp.GetHicon());
    }
}
