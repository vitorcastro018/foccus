namespace Foccus.Agent;

/// <summary>Primeira execução: pede o endereço do painel e o token de instalação.</summary>
public sealed class EnrollForm : Form
{
    private readonly TextBox _server = new() { Width = 320, PlaceholderText = "https://foccus.suaempresa.com" };
    private readonly TextBox _token = new() { Width = 320, PlaceholderText = "fcc_..." };
    private readonly Label _msg = new() { AutoSize = true, ForeColor = Color.Firebrick, MaximumSize = new Size(320, 0) };
    private readonly Button _ok = new() { Text = "Conectar", Width = 100 };
    private readonly AgentConfig _cfg;

    public EnrollForm(AgentConfig cfg, string? server = null, string? token = null)
    {
        _cfg = cfg;
        Text = "Foccus — Configuração";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        AutoSize = true; AutoSizeMode = AutoSizeMode.GrowAndShrink;
        Padding = new Padding(16);

        _server.Text = server ?? cfg.ServerUrl;
        _token.Text = token ?? "";

        var info = new Label
        {
            AutoSize = true, MaximumSize = new Size(320, 0),
            Text = "O Foccus registra quais aplicativos são usados neste computador e por quanto tempo, " +
                   "para o painel da sua empresa. Não captura teclas digitadas nem telas.",
        };

        var panel = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, WrapContents = false };
        panel.Controls.AddRange(new Control[]
        {
            info,
            new Label { Text = "Endereço do painel", AutoSize = true, Margin = new Padding(0, 12, 0, 0) }, _server,
            new Label { Text = "Token de instalação", AutoSize = true, Margin = new Padding(0, 8, 0, 0) }, _token,
            _msg, _ok,
        });
        Controls.Add(panel);
        AcceptButton = _ok;

        _ok.Click += async (_, _) =>
        {
            _msg.Text = ""; _ok.Enabled = false; _ok.Text = "Conectando…";
            try
            {
                var url = ApiClient.NormalizeUrl(_server.Text);
                var r = await ApiClient.EnrollAsync(url, _token.Text);
                _cfg.ServerUrl = url;
                _cfg.DeviceId = r.DeviceId;
                _cfg.SetDeviceKey(r.DeviceKey);
                _cfg.Policy = r.Policy;
                _cfg.Save();
                DialogResult = DialogResult.OK;
            }
            catch (Exception ex)
            {
                _msg.Text = ex is HttpRequestException ? "Não foi possível acessar o servidor. Verifique o endereço." : ex.Message;
                _ok.Enabled = true; _ok.Text = "Conectar";
            }
        };
    }
}
