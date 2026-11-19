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
3. Variáveis (só `DATABASE_URL` é obrigatória):
   - `DATABASE_URL` — connection string do serviço Postgres do Easypanel.
   - `ADMIN_EMAIL` — cria o admin inicial no primeiro deploy. A senha é **gerada automaticamente** e impressa **uma vez** nos logs do app (ou defina `ADMIN_PASSWORD`). `ORG_NAME` define o nome da empresa.
   - `SESSION_SECRET` — opcional: se ausente, é gerado no primeiro deploy e guardado no banco (persiste entre deploys).
   - `COOKIE_SECURE=true` (somente com HTTPS) e `APP_TZ=America/Sao_Paulo`.
4. Porta 3000, domínio com HTTPS. As migrations rodam automaticamente na inicialização.

Contrato do agente: [docs/AGENT-API.md](docs/AGENT-API.md).

## Teste local no Windows (sem Docker)
1. Instale Node 22+ e PostgreSQL 16 (guarde a senha do usuário `postgres`). Crie o banco: `createdb -U postgres foccus`.
2. `cd web`, copie `.env.example` para `.env.local` e ajuste `DATABASE_URL` e `SESSION_SECRET`.
3. `npm install` e `npm run dev` (as migrations rodam sozinhas) → http://localhost:3000
