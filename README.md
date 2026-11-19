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

## Painel (web)
```bash
cd web && npm install
export DATABASE_URL=postgres://foccus:foccus@localhost:5432/foccus SESSION_SECRET=<aleatório>
npm run migrate && npm run dev      # http://localhost:3000 (primeiro acesso cria a empresa/admin)
npm run seed:demo                   # dados fictícios para ver o dashboard
```

## Deploy no Easypanel
1. Serviço **Postgres** (anote a connection string).
2. Serviço **App** a partir deste repositório: Dockerfile `web/Dockerfile`, contexto na raiz.
3. Variáveis: `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECURE=true`, `APP_TZ=America/Sao_Paulo`.
4. Porta 3000, domínio com HTTPS. As migrations rodam automaticamente na inicialização.

Contrato do agente: [docs/AGENT-API.md](docs/AGENT-API.md).
