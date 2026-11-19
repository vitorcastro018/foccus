# Foccus — Plano de ação

## Arquitetura
| Camada | Tecnologia |
|---|---|
| Agente Windows | C# / .NET 8, Serviço do Windows + helper na sessão do usuário, SQLite local |
| Instalador | MSI (WiX), instalação silenciosa (GPO / Intune) |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| Painel | Next.js + Tailwind + shadcn/ui (Vercel) |
| Transporte | HTTPS em lote, fila local offline |

## Coleta do agente
1. A cada 1–2 s: `GetForegroundWindow` → PID, processo, título (opcional).
2. Ociosidade: `GetLastInputInfo` (limite padrão 5 min).
3. Agrupa em sessões `{app, início, fim, ativo, ocioso}`.
4. SQLite local; envio em lote a cada 1–5 min; heartbeat.

## Fases
- **Fase 0**: estrutura do repo, schema do banco, auth. (em andamento)
- **Fase 1 (MVP)**: agente coletando e enviando; painel com máquinas e ranking de apps.
- **Fase 2**: MSI, deploy em massa, auto-update, categorias, relatórios CSV.
- **Fase 3**: alertas, políticas por setor, domínios de navegador, SSO, RBAC.
- **Fase 4**: assinatura de código, anti-desinstalação, auditoria, cobrança.

## LGPD
Agente visível, política de uso e termo de ciência, coleta mínima, retenção configurável.
