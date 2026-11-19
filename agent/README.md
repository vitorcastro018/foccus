# Foccus Agent (Windows)

App de bandeja (.NET 8 / WinForms) que roda na sessão do usuário, **sem precisar de administrador**.

## O que ele faz
- A cada 1 s lê o app em foco (`GetForegroundWindow`) e a ociosidade (`GetLastInputInfo`, limite padrão 5 min).
- Agrupa em sessões por aplicativo (máx. 5 min cada) e guarda em fila local (`%APPDATA%\Foccus\queue.jsonl`).
- A cada ~60 s envia o lote para `/api/agent/ingest`; se estiver offline, mantém a fila e tenta de novo.
- Tela bloqueada não conta. Suspensão/hibernação (intervalos > 10 s) não conta.
- **Não** captura teclas, telas nem conteúdo. Títulos de janela só se a política da organização permitir.
- Ícone sempre visível na bandeja + aviso ao iniciar. Chave do dispositivo guardada com DPAPI.

## Compilar e rodar
Requer o [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).
```powershell
cd agent
.\build.ps1          # gera agent\dist\Foccus.exe (autônomo, ~70 MB)
.\dist\Foccus.exe    # 1ª execução: informe endereço do painel e token
```
Alternativa: baixe `Foccus.exe` no artefato **Foccus-agent-win-x64** da aba *Actions* do GitHub.

Também aceita `Foccus.exe --server https://painel --token fcc_...` para pré-preencher o formulário.

## Arquivos locais (`%APPDATA%\Foccus`)
`config.json` (chave protegida), `queue.jsonl` (pendentes), `agent.log`.
Para desvincular: feche o agente pela bandeja e apague a pasta.
