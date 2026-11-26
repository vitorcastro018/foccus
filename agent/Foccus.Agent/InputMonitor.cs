using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Foccus.Agent;

/// <summary>
/// Mede a ociosidade por atividade do usuário, conforme a política da organização:
///  • "clicks": só cliques do mouse e rolagem (movimento e teclas não contam — um "mouse jiggler" não mascara);
///  • "clicks_keyboard": também conta o teclado.
/// Os hooks de baixo nível guardam SOMENTE o instante do último evento: sem posição, sem código de tecla,
/// sem conteúdo. O hook de teclado só é instalado quando a política pede teclado.
/// Deve ser usado na thread de UI (que já tem laço de mensagens).
/// </summary>
public sealed class InputMonitor : IDisposable
{
    private const int WH_KEYBOARD_LL = 13, WH_MOUSE_LL = 14;
    private const int WM_LBUTTONDOWN = 0x0201, WM_RBUTTONDOWN = 0x0204, WM_MBUTTONDOWN = 0x0207,
                      WM_MOUSEWHEEL = 0x020A, WM_XBUTTONDOWN = 0x020B, WM_MOUSEHWHEEL = 0x020E,
                      WM_KEYDOWN = 0x0100, WM_SYSKEYDOWN = 0x0104;

    private delegate IntPtr HookProc(int code, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)] private static extern IntPtr SetWindowsHookEx(int id, HookProc fn, IntPtr mod, uint thread);
    [DllImport("user32.dll")] private static extern bool UnhookWindowsHookEx(IntPtr hook);
    [DllImport("user32.dll")] private static extern IntPtr CallNextHookEx(IntPtr hook, int code, IntPtr wParam, IntPtr lParam);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr GetModuleHandle(string? name);

    private readonly HookProc _mouseProc, _keyProc;   // referências para o GC não coletar os delegates
    private IntPtr _mouseHook, _keyHook;
    private long _lastClick = Stopwatch.GetTimestamp();
    private long _lastKey = Stopwatch.GetTimestamp();
    private readonly IntPtr _module;

    public InputMonitor()
    {
        _mouseProc = MouseCallback; _keyProc = KeyCallback;
        using var p = Process.GetCurrentProcess();
        _module = GetModuleHandle(p.MainModule?.ModuleName);
        _mouseHook = SetWindowsHookEx(WH_MOUSE_LL, _mouseProc, _module, 0);
        if (_mouseHook == IntPtr.Zero) Log.Write("clique: hook indisponível (erro " + Marshal.GetLastWin32Error() + ")");
    }

    /// <summary>Instala/remove o hook de teclado conforme a política.</summary>
    public void UseKeyboard(bool on)
    {
        if (on && _keyHook == IntPtr.Zero)
        {
            _lastKey = Stopwatch.GetTimestamp();
            _keyHook = SetWindowsHookEx(WH_KEYBOARD_LL, _keyProc, _module, 0);
            if (_keyHook == IntPtr.Zero) Log.Write("teclado: hook indisponível (erro " + Marshal.GetLastWin32Error() + ")");
        }
        else if (!on && _keyHook != IntPtr.Zero)
        {
            UnhookWindowsHookEx(_keyHook); _keyHook = IntPtr.Zero;
        }
    }

    public bool MouseActive => _mouseHook != IntPtr.Zero;
    public bool KeyboardActive => _keyHook != IntPtr.Zero;

    private static double Since(long ticks) => (Stopwatch.GetTimestamp() - Interlocked.Read(ref ticks)) / (double)Stopwatch.Frequency;

    /// <summary>Segundos desde o último clique/rolagem (ou desde o início do agente).</summary>
    public double ClickIdleSeconds() => Since(_lastClick);

    /// <summary>Segundos desde a última tecla (só vale com o hook de teclado ligado).</summary>
    public double KeyIdleSeconds() => Since(_lastKey);

    private IntPtr MouseCallback(int code, IntPtr wParam, IntPtr lParam)
    {
        if (code >= 0)
        {
            switch ((int)wParam)
            {
                case WM_LBUTTONDOWN: case WM_RBUTTONDOWN: case WM_MBUTTONDOWN:
                case WM_XBUTTONDOWN: case WM_MOUSEWHEEL: case WM_MOUSEHWHEEL:
                    Interlocked.Exchange(ref _lastClick, Stopwatch.GetTimestamp());
                    break;
            }
        }
        return CallNextHookEx(_mouseHook, code, wParam, lParam);
    }

    private IntPtr KeyCallback(int code, IntPtr wParam, IntPtr lParam)
    {
        // lParam (que contém o código da tecla) nunca é lido.
        if (code >= 0 && ((int)wParam == WM_KEYDOWN || (int)wParam == WM_SYSKEYDOWN))
            Interlocked.Exchange(ref _lastKey, Stopwatch.GetTimestamp());
        return CallNextHookEx(_keyHook, code, wParam, lParam);
    }

    public void Dispose()
    {
        if (_mouseHook != IntPtr.Zero) { UnhookWindowsHookEx(_mouseHook); _mouseHook = IntPtr.Zero; }
        UseKeyboard(false);
    }
}
