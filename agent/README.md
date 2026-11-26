# Foccus Agent (Windows)

App de bandeja (.NET 8 / WinForms) que roda na sessão do usuário, **sem precisar de administrador**.

## O que ele faz
- A cada 1 s lê o app em foco (`GetForegroundWindow`) e a ociosidade. **A ociosidade é configurável no painel (Configurações):** só cliques do mouse e rolagem (padrão), ou cliques + teclado. Hooks de baixo nível guardam só o instante do último evento — nunca posição, tecla ou conteúdo; o hook de teclado só é instalado no modo "cliques + teclado". Limite padrão 5 min.
- Agrupa em sessões por aplicativo (máx. 5 min cada) e guarda em fila local (`%APPDATA%\Foccus\queue.jsonl`).
- A cada ~60 s envia o lote para `/api/agent/ingest`; se estiver offline, mantém a fila e tenta de novo.
- Tela bloqueada não conta. Suspensão/hibernação (intervalos > 10 s) não conta.
- **Sites (sem extensão):** quando o app em foco é um navegador (Chrome, Edge, Brave, Opera, Vivaldi, Firefox), acompanha a **guia ativa** (leitura a cada 1 s da barra de endereços via UI Automation) e guarda **somente o domínio** (`github.com`) — nunca caminho, query ou título. Ligado/desligado em *Configurações → Coletar sites*. Melhor esforço: depende de o navegador expor a barra de endereços; falhas aparecem no `agent.log` ("site: não foi possível ler…").
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
