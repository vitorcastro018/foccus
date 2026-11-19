# Foccus

Monitoramento corporativo de uso de aplicativos em máquinas Windows.

- `agent/` — agente Windows (C# / .NET 8): serviço + helper de sessão que coleta app em foco e ociosidade.
- `web/` — painel admin (Next.js + Tailwind + shadcn/ui).
- `supabase/` — schema (migrations), políticas RLS e Edge Functions de ingestão.
- `docs/` — plano de ação e decisões de arquitetura.

Veja [docs/PLANO.md](docs/PLANO.md).

## Princípios
- Transparência: o agente é visível ao colaborador (ícone na bandeja). Sem modo oculto.
- Minimização de dados (LGPD): sem keylogger e sem screenshots no MVP; títulos de janela opcionais por política.
- Isolamento por organização via RLS.
