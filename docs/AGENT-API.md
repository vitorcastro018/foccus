# API do agente (contrato)

Base: `https://<seu-dominio>/api/agent`

## POST /enroll
Registra a máquina com o token de instalação (gerado em Configurações).
```json
{ "token": "fcc_...", "hostname": "PC-01", "windows_user": "ana", "agent_version": "0.1.0" }
```
Resposta `200`: `{ "device_id", "device_key": "fdk_...", "policy": {...} }`.
Guarde `device_key` com proteção (DPAPI); ela não é exibida novamente. `401` se o token for inválido/expirado.

## POST /ingest
Cabeçalho: `Authorization: Bearer <device_key>`. Também funciona como heartbeat (lote vazio).
```json
{
  "agent_version": "0.1.0", "windows_user": "ana",
  "sessions": [
    { "process_name": "chrome.exe", "window_title": "opcional", "site": "github.com",
      "started_at": "2026-11-19T12:00:00Z", "ended_at": "2026-11-19T12:05:00Z",
      "active_seconds": 280, "idle_seconds": 20 }
  ]
}
```
Resposta: `{ "accepted": n, "rejected": n, "policy": { "collect_window_titles", "collect_sites", "idle_mode" (`clicks` | `clicks_keyboard`), "idle_threshold_seconds", "flush_interval_seconds" } }`.

- Máximo de 500 sessões por lote; sessões > 24h ou no futuro são rejeitadas.
- `window_title` só é gravado se a política da organização permitir.
- `site` (somente domínio, ex.: `github.com`) só é gravado se `collect_sites` estiver ligado; o servidor normaliza (minúsculas, sem `www.`) e descarta valores que não sejam um domínio.
- Atualize a política local do agente com o `policy` retornado.
