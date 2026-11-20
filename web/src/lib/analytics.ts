import { q } from "./db";
import { PERIOD_START as P, TZ } from "./queries";

const dev = (n: number, id?: string) => (id ? ` and s.device_id = $${n}` : "");
// Categoria efetiva: a do site (se classificado) vence a do app; senão neutro.
const CAT = `coalesce(sc.category, c.category, 'neutral')`;
const PROD = `${CAT}='productive'`;
const JOIN = `left join app_catalog c on c.org_id=s.org_id and c.process_name=s.process_name
              left join site_catalog sc on sc.org_id=s.org_id and sc.domain=s.site`;

export type Kpis = {
  a: number; i: number; prod: number; pa: number; pi: number; pprod: number; machines: number;
};

/** Indicadores do período atual e do período anterior de mesma duração (para comparação). */
export async function kpis(orgId: string, days: number, device?: string): Promise<Kpis> {
  const [r] = await q<Kpis>(
    `select
       coalesce(sum(s.active_seconds) filter (where s.started_at >= ${P}),0)::float a,
       coalesce(sum(s.idle_seconds)   filter (where s.started_at >= ${P}),0)::float i,
       coalesce(sum(s.active_seconds) filter (where s.started_at >= ${P} and ${PROD}),0)::float prod,
       coalesce(sum(s.active_seconds) filter (where s.started_at < ${P}),0)::float pa,
       coalesce(sum(s.idle_seconds)   filter (where s.started_at < ${P}),0)::float pi,
       coalesce(sum(s.active_seconds) filter (where s.started_at < ${P} and ${PROD}),0)::float pprod,
       (count(distinct s.device_id) filter (where s.started_at >= ${P}))::int machines
     from app_sessions s ${JOIN}
     where s.org_id=$1 and s.started_at >= ${P} - ($3::int * interval '1 day')${dev(4, device)}`,
    device ? [orgId, TZ, days, device] : [orgId, TZ, days]
  );
  return r;
}

export type Bucket = { key: string; label: string; a: number; i: number; prod: number };

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

/** Série por hora (1 dia) ou por dia (7/30), com buckets vazios preenchidos. */
export async function series(orgId: string, days: number, device?: string): Promise<Bucket[]> {
  const hourly = days === 1;
  const key = hourly
    ? `extract(hour from s.started_at at time zone $2)::int::text`
    : `to_char(s.started_at at time zone $2,'YYYY-MM-DD')`;
  const rows = await q<{ k: string; a: number; i: number; prod: number }>(
    `select ${key} k, sum(s.active_seconds)::float a, sum(s.idle_seconds)::float i,
            coalesce(sum(s.active_seconds) filter (where ${PROD}),0)::float prod
       from app_sessions s ${JOIN}
      where s.org_id=$1 and s.started_at >= ${P}${dev(4, device)}
      group by 1`,
    device ? [orgId, TZ, days, device] : [orgId, TZ, days]
  );
  const map = new Map(rows.map((r) => [r.k, r]));
  const out: Bucket[] = [];
  if (hourly) {
    const nowH = Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date())) % 24;
    for (let h = 0; h <= Math.max(nowH, 17); h++) {
      const r = map.get(String(h));
      out.push({ key: String(h), label: String(h).padStart(2, "0"), a: r?.a ?? 0, i: r?.i ?? 0, prod: r?.prod ?? 0 });
    }
  } else {
    for (let n = days - 1; n >= 0; n--) {
      const k = ymd(new Date(Date.now() - n * 86_400_000));
      const r = map.get(k);
      out.push({ key: k, label: `${k.slice(8)}/${k.slice(5, 7)}`, a: r?.a ?? 0, i: r?.i ?? 0, prod: r?.prod ?? 0 });
    }
  }
  return out;
}

/** Atividade por dia da semana x hora nos últimos 30 dias. Matriz [dow 0=dom][hora]. */
export async function heatmap(orgId: string, device?: string): Promise<number[][]> {
  const rows = await q<{ dow: number; hr: number; s: number }>(
    `select extract(dow from s.started_at at time zone $2)::int dow,
            extract(hour from s.started_at at time zone $2)::int hr, sum(s.active_seconds)::float s
       from app_sessions s
      where s.org_id=$1 and s.started_at >= now() - interval '30 days'${dev(3, device)}
      group by 1,2`,
    device ? [orgId, TZ, device] : [orgId, TZ]
  );
  const m = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of rows) m[r.dow][r.hr] = r.s;
  return m;
}

export async function topApps(orgId: string, days: number, device?: string) {
  return q<{ process_name: string; seconds: number; category: string | null }>(
    `select s.process_name, sum(s.active_seconds)::float seconds, c.category
       from app_sessions s ${JOIN}
      where s.org_id=$1 and s.started_at >= ${P}${dev(4, device)}
      group by s.process_name, c.category order by sum(s.active_seconds) desc limit 8`,
    device ? [orgId, TZ, days, device] : [orgId, TZ, days]
  );
}

export async function categories(orgId: string, days: number, device?: string) {
  const rows = await q<{ category: string; seconds: number }>(
    `select ${CAT} category, sum(s.active_seconds)::float seconds
       from app_sessions s ${JOIN}
      where s.org_id=$1 and s.started_at >= ${P}${dev(4, device)}
      group by 1`,
    device ? [orgId, TZ, days, device] : [orgId, TZ, days]
  );
  const g = (c: string) => rows.find((r) => r.category === c)?.seconds ?? 0;
  return { productive: g("productive"), neutral: g("neutral"), unproductive: g("unproductive") };
}

export type MachineRow = {
  id: string; hostname: string; windows_user: string | null; last_seen_at: string | null;
  productive: number; neutral: number; unproductive: number; idle: number; active: number;
};

/** Comparativo entre máquinas (todas as máquinas, tempo por categoria). */
export async function machineComparison(orgId: string, days: number): Promise<MachineRow[]> {
  return q<MachineRow>(
    `select d.id, d.hostname, d.windows_user, d.last_seen_at,
            coalesce(sum(s.active_seconds) filter (where ${CAT}='productive'),0)::float productive,
            coalesce(sum(s.active_seconds) filter (where ${CAT}='neutral'),0)::float neutral,
            coalesce(sum(s.active_seconds) filter (where ${CAT}='unproductive'),0)::float unproductive,
            coalesce(sum(s.idle_seconds),0)::float idle, coalesce(sum(s.active_seconds),0)::float active
       from devices d
       left join app_sessions s on s.device_id=d.id and s.started_at >= ${P}
       left join app_catalog c on c.org_id=d.org_id and c.process_name=s.process_name
       left join site_catalog sc on sc.org_id=d.org_id and sc.domain=s.site
      where d.org_id=$1
      group by d.id order by coalesce(sum(s.active_seconds),0) desc limit 12`,
    [orgId, TZ, days]
  );
}

export async function deviceOptions(orgId: string) {
  return q<{ id: string; hostname: string }>("select id, hostname from devices where org_id=$1 order by hostname", [orgId]);
}

export type Seg = { process_name: string; smin: number; emin: number; active: number; idle: number };

/** Sessões de um dia (YYYY-MM-DD, no fuso configurado) de uma máquina, em minutos do dia. */
export async function dayTimeline(orgId: string, device: string, day: string): Promise<Seg[]> {
  return q<Seg>(
    `select s.process_name, s.active_seconds::float active, s.idle_seconds::float idle,
            greatest(0, extract(epoch from (s.started_at at time zone $2) - $3::date::timestamp)/60)::float smin,
            least(1440, extract(epoch from (s.ended_at at time zone $2) - $3::date::timestamp)/60)::float emin
       from app_sessions s
      where s.org_id=$1 and s.device_id=$4
        and s.started_at >= ($3::date::timestamp at time zone $2)
        and s.started_at <  (($3::date + 1)::timestamp at time zone $2)
      order by s.started_at`,
    [orgId, TZ, day, device]
  );
}

export type Workday = { day: string; first: number; last: number; active: number };

/** Jornada por dia: primeira e última atividade (minutos do dia) e tempo ativo. */
export async function workdays(orgId: string, days: number, device: string): Promise<Workday[]> {
  return q<Workday>(
    `select to_char(d,'YYYY-MM-DD') as day, min(smin)::float as first, least(1440, max(emin))::float as last, sum(active)::float as active
       from (
         select date_trunc('day', s.started_at at time zone $2) d,
                extract(epoch from (s.started_at at time zone $2) - date_trunc('day', s.started_at at time zone $2))/60 smin,
                extract(epoch from (s.ended_at at time zone $2) - date_trunc('day', s.started_at at time zone $2))/60 emin,
                s.active_seconds active
           from app_sessions s
          where s.org_id=$1 and s.device_id=$4 and s.started_at >= ${P}
       ) t group by d order by d`,
    [orgId, TZ, days, device]
  );
}

export function todayLocal() { return ymd(new Date()); }
export function parseDay(v?: string | string[]) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(+new Date(s)) ? s : todayLocal();
}
export function shiftDay(day: string, delta: number) {
  const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Sites mais acessados (domínio da guia ativa), com categoria. */
export async function topSites(orgId: string, days: number, device?: string, limit = 8) {
  return q<{ domain: string; seconds: number; machines: number; category: string | null }>(
    `select s.site domain, sum(s.active_seconds)::float seconds, count(distinct s.device_id)::int machines, sc.category
       from app_sessions s
       left join site_catalog sc on sc.org_id=s.org_id and sc.domain=s.site
      where s.org_id=$1 and s.site is not null and s.started_at >= ${P}${dev(4, device)}
      group by s.site, sc.category order by sum(s.active_seconds) desc limit ${Number(limit) | 0}`,
    device ? [orgId, TZ, days, device] : [orgId, TZ, days]
  );
}
