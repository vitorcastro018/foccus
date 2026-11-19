-- Foccus: schema inicial (Postgres puro). Multi-tenant desde já (org_id),
-- mas o isolamento é feito na aplicação (sem RLS / sem Supabase).

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  retention_days int not null default 90,
  collect_window_titles boolean not null default false,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin' check (role in ('admin','manager','viewer')),
  created_at timestamptz not null default now()
);
create index on users(org_id);

create table groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null
);
create index on groups(org_id);

create table enrollment_tokens (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  group_id uuid references groups(id) on delete set null,
  hostname text not null,
  windows_user text,
  agent_version text,
  device_key_hash text not null unique,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index on devices(org_id);

create table app_catalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  process_name text not null,
  display_name text,
  category text not null default 'neutral' check (category in ('productive','neutral','unproductive')),
  unique (org_id, process_name)
);

create table app_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  device_id uuid not null references devices(id) on delete cascade,
  process_name text not null,
  window_title text,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  active_seconds int not null default 0,
  idle_seconds int not null default 0,
  check (ended_at >= started_at)
);
create index on app_sessions(org_id, started_at desc);
create index on app_sessions(device_id, started_at desc);
