using Microsoft.Win32;

namespace Foccus.Agent;

/// <summary>Inicia o agente com o Windows (chave HKCU\...\Run, sem precisar de administrador).</summary>
internal static class Autostart
{
    private const string Key = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string Name = "Foccus";

    public static bool IsEnabled()
    {
        using var k = Registry.CurrentUser.OpenSubKey(Key);
        return k?.GetValue(Name) is string;
    }

    public static void Set(bool enabled)
    {
        using var k = Registry.CurrentUser.CreateSubKey(Key);
        if (enabled) k.SetValue(Name, $"\"{Environment.ProcessPath}\"");
        else k.DeleteValue(Name, false);
    }
}
