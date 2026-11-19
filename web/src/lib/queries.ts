import { q } from "./db";

export const TZ = process.env.APP_TZ || "America/Sao_Paulo";
export const ONLINE_WINDOW_MIN = 5;

/** Início do período (dia local à meia-noite, N-1 dias atrás). */
const PERIOD_START = `(date_trunc('day', now() at time zone $2) - (($3::int - 1) * interval '1 day')) at time zone $2`;

export function parseDays(v: string | string[] | undefined): 1 | 7 | 30 {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return n === 7 || n === 30 ? n : 1;
}

export async function dashboardData(orgId: string, days: number) {
  const base = [orgId, TZ, days];

  const [kpi] = await q<{
    active: string; idle: string; machines_active: string;
  }>(
    `select coalesce(sum(active_seconds),0)::text active, coalesce(sum(idle_seconds),0)::text idle,
            count(distinct device_id)::text machines_active
       from app_sessions where org_id=$1 and started_at >= ${PERIOD_START}`,
    base
  );

  const [dev] = await q<{ total: string; online: string }>(
    `select count(*)::text total,
            count(*) filter (where last_seen_at > now() - interval '${ONLINE_WINDOW_MIN} minutes')::text online
       from devices where org_id=$1`,
    [orgId]
  );

  const topApps = await q<{ process_name: string; seconds: string; category: string | null }>(
    `select s.process_name, sum(s.active_seconds)::text seconds, c.category
       from app_sessions s
       left join app_catalog c on c.org_id=s.org_id and c.process_name=s.process_name
      where s.org_id=$1 and s.started_at >= ${PERIOD_START}
      group by s.process_name, c.category
      order by sum(s.active_seconds) desc limit 8`,
    base
  );

  const categories = await q<{ category: string; seconds: string }>(
    `select coalesce(c.category,'neutral') category, sum(s.active_seconds)::text seconds
       from app_sessions s
       left join app_catalog c on c.org_id=s.org_id and c.process_name=s.process_name
      where s.org_id=$1 and s.started_at >= ${PERIOD_START}
      group by 1`,
    base
  );

  const topDevices = await q<{ id: string; hostname: string; windows_user: string | null; seconds: string; last_seen_at: string | null }>(
    `select d.id, d.hostname, d.windows_user, coalesce(sum(s.active_seconds),0)::text seconds, d.last_seen_at
       from devices d
       left join app_sessions s on s.device_id=d.id and s.started_at >= ${PERIOD_START}
      where d.org_id=$1
      group by d.id order by coalesce(sum(s.active_seconds),0) desc limit 6`,
    base
  );

  // Série: por hora (período de 1 dia) ou por dia (7/30 dias)
  const series =
    days === 1
      ? await q<{ label: string; seconds: string }>(
          `select to_char(date_trunc('hour', started_at at time zone $2),'HH24') label,
                  sum(active_seconds)::text seconds
             from app_sessions where org_id=$1 and started_at >= ${PERIOD_START}
            group by 1 order by 1`,
          base
        )
      : await q<{ label: string; seconds: string }>(
          `select to_char(date_trunc('day', started_at at time zone $2),'DD/MM') label,
                  sum(active_seconds)::text seconds, date_trunc('day', started_at at time zone $2) d
             from app_sessions where org_id=$1 and started_at >= ${PERIOD_START}
            group by d, label order by d`,
          base
        );

  return { kpi, dev, topApps, categories, topDevices, series };
}

export async function devicesList(orgId: string, days: number) {
  return q<{
    id: string; hostname: string; windows_user: string | null; agent_version: string | null;
    last_seen_at: string | null; online: boolean; active: string; idle: string; group_name: string | null;
  }>(
    `select d.id, d.hostname, d.windows_user, d.agent_version, d.last_seen_at, g.name group_name,
            (d.last_seen_at > now() - interval '${ONLINE_WINDOW_MIN} minutes') online,
            coalesce(sum(s.active_seconds),0)::text active, coalesce(sum(s.idle_seconds),0)::text idle
       from devices d
       left join groups g on g.id=d.group_id
       left join app_sessions s on s.device_id=d.id and s.started_at >= ${PERIOD_START}
      where d.org_id=$1
      group by d.id, g.name order by d.hostname`,
    [orgId, TZ, days]
  );
}

export async function deviceDetail(orgId: string, id: string, days: number) {
  const [device] = await q<any>(`select * from devices where org_id=$1 and id=$2`, [orgId, id]);
  if (!device) return null;
  const apps = await q<{ process_name: string; active: string; idle: string; category: string | null }>(
    `select s.process_name, sum(s.active_seconds)::text active, sum(s.idle_seconds)::text idle, c.category
       from app_sessions s
       left join app_catalog c on c.org_id=s.org_id and c.process_name=s.process_name
      where s.org_id=$1 and s.device_id=$4 and s.started_at >= ${PERIOD_START}
      group by s.process_name, c.category order by sum(s.active_seconds) desc limit 20`,
    [orgId, TZ, days, id]
  );
  const timeline = await q<{ process_name: string; window_title: string | null; started_at: string; ended_at: string; active_seconds: number }>(
    `select process_name, window_title, started_at, ended_at, active_seconds
       from app_sessions where org_id=$1 and device_id=$2 order by started_at desc limit 40`,
    [orgId, id]
  );
  return { device, apps, timeline };
}

export async function appsCatalog(orgId: string, days: number) {
  return q<{ process_name: string; seconds: string; devices: string; category: string | null }>(
    `select s.process_name, sum(s.active_seconds)::text seconds, count(distinct s.device_id)::text devices, c.category
       from app_sessions s
       left join app_catalog c on c.org_id=s.org_id and c.process_name=s.process_name
      where s.org_id=$1 and s.started_at >= ${PERIOD_START}
      group by s.process_name, c.category order by sum(s.active_seconds) desc limit 100`,
    [orgId, TZ, days]
  );
}
