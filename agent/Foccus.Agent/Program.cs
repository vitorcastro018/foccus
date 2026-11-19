namespace Foccus.Agent;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        using var mutex = new Mutex(true, @"Local\Foccus.Agent", out var first);
        if (!first) return; // já está rodando para este usuário

        ApplicationConfiguration.Initialize();
        Application.ThreadException += (_, e) => Log.Write("erro: " + e.Exception);
        AppDomain.CurrentDomain.UnhandledException += (_, e) => Log.Write("fatal: " + e.ExceptionObject);

        var cfg = AgentConfig.Load();

        // Uso: Foccus.exe --server https://painel --token fcc_...   (pré-preenche o formulário)
        string? server = Arg(args, "--server"), token = Arg(args, "--token");

        if (!cfg.IsEnrolled || (server != null && token != null && server != cfg.ServerUrl))
        {
            using var form = new EnrollForm(cfg, server, token);
            if (form.ShowDialog() != DialogResult.OK) return;
        }

        Application.Run(new TrayApp(cfg));
    }

    private static string? Arg(string[] a, string name)
    {
        var i = Array.IndexOf(a, name);
        return i >= 0 && i + 1 < a.Length ? a[i + 1] : null;
    }
}
