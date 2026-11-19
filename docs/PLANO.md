# Foccus — Plano de ação

## Arquitetura
| Camada | Tecnologia |
|---|---|
| Agente Windows | C# / .NET 8, Serviço do Windows + helper na sessão do usuário, SQLite local |
| Instalador | MSI (WiX), instalação silenciosa (GPO / Intune) |
| Backend + Painel | Next.js (TypeScript): painel e API de ingestão em um único container |
| Banco | PostgreSQL 16 puro (migrations SQL em `db/migrations`) |
| Auth | Email/senha próprio (argon2) + sessão em cookie; sem Supabase |
| Deploy | Docker no Easypanel (app + Postgres como serviços) |
| UI | Tailwind + shadcn/ui |
| Transporte | HTTPS em lote, fila local offline |

## Coleta do agente
1. A cada 1–2 s: `GetForegroundWindow` → PID, processo, título (opcional).
2. Ociosidade: `GetLastInputInfo` (limite padrão 5 min).
3. Agrupa em sessões `{app, início, fim, ativo, ocioso}`.
4. SQLite local; envio em lote a cada 1–5 min; heartbeat.

## Fases
- **Fase 0**: estrutura do repo, schema Postgres, docker-compose. (feito)
- **Fase 1 (MVP)**: agente coletando e enviando; painel com máquinas e ranking de apps.
- **Fase 2**: MSI, deploy em massa, auto-update, categorias, relatórios CSV.
- **Fase 3**: alertas, políticas por setor, domínios de navegador, SSO, RBAC.
- **Fase 4**: assinatura de código, anti-desinstalação, auditoria, cobrança.

## LGPD
Agente visível, política de uso e termo de ciência, coleta mínima, retenção configurável.

## Estratégia
Primeiro uso interno na nossa empresa; `org_id` já está em todas as tabelas para virar multi-tenant depois sem refazer o schema. O isolamento por organização é feito na camada de aplicação (toda query filtra por `org_id` da sessão).
