-- Sites visitados (domínio da guia ativa do navegador, reportado pela extensão via agente).
alter table app_sessions add column site text;
create index app_sessions_site_idx on app_sessions(org_id, site, started_at) where site is not null;

create table site_catalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  domain text not null,
  category text not null default 'neutral' check (category in ('productive','neutral','unproductive')),
  unique (org_id, domain)
);

alter table organizations add column collect_sites boolean not null default true;
