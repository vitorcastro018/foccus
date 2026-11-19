# Foccus

Monitoramento corporativo de uso de aplicativos em máquinas Windows.

- `agent/` — agente Windows (C# / .NET 8): serviço + helper de sessão que coleta app em foco e ociosidade.
- `web/` — painel admin + API de ingestão (Next.js), empacotado em Docker para o Easypanel.
- `db/` — migrations SQL do PostgreSQL.
- `docs/` — plano de ação e decisões de arquitetura.

Veja [docs/PLANO.md](docs/PLANO.md).

## Princípios
- Transparência: o agente é visível ao colaborador (ícone na bandeja). Sem modo oculto.
- Minimização de dados (LGPD): sem keylogger e sem screenshots no MVP; títulos de janela opcionais por política.
- Isolamento por organização (`org_id`) na camada de aplicação.

## Desenvolvimento local
```bash
docker compose up -d db   # sobe o Postgres e aplica db/migrations
cp .env.example .env
```
