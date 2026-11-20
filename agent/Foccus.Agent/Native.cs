using System.ComponentModel;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Foccus.Agent;

internal static class Native
{
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll")] private static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
    [DllImport("kernel32.dll")] private static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern bool QueryFullProcessImageName(IntPtr h, int flags, StringBuilder exe, ref int size);

    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    [StructLayout(LayoutKind.Sequential)]
    private struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }

    /// <summary>Segundos desde o último input (teclado/mouse) do usuário.</summary>
    public static double IdleSeconds()
    {
        var info = new LASTINPUTINFO { cbSize = (uint)Marshal.SizeOf<LASTINPUTINFO>() };
        if (!GetLastInputInfo(ref info)) return 0;
        uint idleMs = unchecked((uint)Environment.TickCount - info.dwTime);
        return idleMs / 1000.0;
    }

    public static IntPtr ForegroundHandle() => GetForegroundWindow();

    /// <summary>Processo (ex.: chrome.exe) e título da janela em foco. Null se não houver.</summary>
    public static (string Process, string Title)? Foreground()
    {
        var h = GetForegroundWindow();
        if (h == IntPtr.Zero) return null;
        GetWindowThreadProcessId(h, out var pid);
        if (pid == 0) return null;

        string name = ProcessName(pid) ?? "desconhecido.exe";
        var sb = new StringBuilder(256);
        GetWindowText(h, sb, sb.Capacity);
        return (name, sb.ToString());
    }

    private static string? ProcessName(uint pid)
    {
        var h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (h != IntPtr.Zero)
        {
            try
            {
                var sb = new StringBuilder(1024);
                int size = sb.Capacity;
                if (QueryFullProcessImageName(h, 0, sb, ref size))
                    return Path.GetFileName(sb.ToString(0, size));
            }
            finally { CloseHandle(h); }
        }
        try { return Process.GetProcessById((int)pid).ProcessName + ".exe"; }
        catch (Exception e) when (e is ArgumentException or InvalidOperationException or Win32Exception) { return null; }
    }
}
