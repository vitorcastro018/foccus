using System.Text.Json;

namespace Foccus.Agent;

/// <summary>Fila durável em disco (JSON Lines). Mantém os dados enquanto a máquina estiver offline.</summary>
public sealed class SessionQueue
{
    private const int MaxItems = 20_000;
    private readonly object _l = new();
    private readonly string _path = Path.Combine(AgentConfig.Dir, "queue.jsonl");

    public void Add(UsageSession s)
    {
        lock (_l)
        {
            Directory.CreateDirectory(AgentConfig.Dir);
            File.AppendAllText(_path, JsonSerializer.Serialize(s) + "\n");
        }
    }

    public List<UsageSession> Peek(int max)
    {
        lock (_l)
        {
            var list = new List<UsageSession>();
            if (!File.Exists(_path)) return list;
            foreach (var line in File.ReadLines(_path))
            {
                if (list.Count >= max) break;
                try { var s = JsonSerializer.Deserialize<UsageSession>(line); if (s != null) list.Add(s); } catch { }
            }
            return list;
        }
    }

    /// <summary>Remove os n primeiros registros (já enviados) e aplica o limite de tamanho.</summary>
    public void Drop(int n)
    {
        lock (_l)
        {
            if (!File.Exists(_path)) return;
            var rest = File.ReadLines(_path).Skip(n).ToList();
            if (rest.Count > MaxItems) rest = rest.Skip(rest.Count - MaxItems).ToList();
            var tmp = _path + ".tmp";
            File.WriteAllLines(tmp, rest);
            File.Move(tmp, _path, true);
        }
    }

    public int Count { get { lock (_l) { return File.Exists(_path) ? File.ReadLines(_path).Count() : 0; } } }
}
