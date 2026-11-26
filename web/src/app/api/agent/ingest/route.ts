import { NextResponse } from "next/server";
import { pool, q } from "@/lib/db";
import { sha256 } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BATCH = 500;
const DOMAIN_RE = /^(?=.{1,200}$)([a-z0-9_-]+\.)*[a-z0-9_-]+(\.[a-z0-9_-]+|:\d+)?$/;

/** Mantém só o domínio (sem esquema, caminho ou query), em minúsculas, sem "www.". */
function cleanSite(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const d = v.trim().toLowerCase().replace(/^www\./, "");
  return DOMAIN_RE.test(d) ? d : null;
}
const MAX_SESSION_SECONDS = 24 * 3600;

type InSession = {
  process_name?: unknown; window_title?: unknown; site?: unknown; started_at?: unknown; ended_at?: unknown;
  active_seconds?: unknown; idle_seconds?: unknown;
};

/** Recebe um lote de sessões de uso. Autenticação: Authorization: Bearer <device_key>. Também serve de heartbeat (lote vazio). */
export async function POST(req: Request) {
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!key) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const [dev] = await q<{ id: string; org_id: string }>("select id, org_id from devices where device_key_hash=$1", [sha256(key)]);
  if (!dev) return NextResponse.json({ error: "dispositivo desconhecido" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const sessions: InSession[] = Array.isArray(body?.sessions) ? body.sessions.slice(0, MAX_BATCH) : [];

  const [org] = await q<{ collect_window_titles: boolean; collect_sites: boolean; idle_mode: string }>("select collect_window_titles, collect_sites, idle_mode from organizations where id=$1", [dev.org_id]);
  const keepTitles = !!org?.collect_window_titles;
  const keepSites = !!org?.collect_sites;

  const rows: unknown[][] = [];
  for (const s of sessions) {
    const name = String(s.process_name ?? "").trim().slice(0, 200);
    const start = new Date(String(s.started_at));
    const end = new Date(String(s.ended_at));
    const active = Math.max(0, Math.floor(Number(s.active_seconds) || 0));
    const idle = Math.max(0, Math.floor(Number(s.idle_seconds) || 0));
    if (!name || isNaN(+start) || isNaN(+end) || end < start) continue;
    if (+end - +start > MAX_SESSION_SECONDS * 1000 || end.getTime() > Date.now() + 5 * 60_000) continue;
    rows.push([
      dev.org_id, dev.id, name,
      keepTitles && s.window_title ? String(s.window_title).slice(0, 300) : null,
      start.toISOString(), end.toISOString(), Math.min(active, MAX_SESSION_SECONDS), Math.min(idle, MAX_SESSION_SECONDS),
      keepSites ? cleanSite(s.site) : null,
    ]);
  }

  if (rows.length > 0) {
    const values = rows.map((_, i) => `(${Array.from({ length: 9 }, (_, j) => `$${i * 9 + j + 1}`).join(",")})`).join(",");
    await pool.query(
      `insert into app_sessions(org_id, device_id, process_name, window_title, started_at, ended_at, active_seconds, idle_seconds, site) values ${values}`,
      rows.flat() as any[]
    );
  }

  await q(
    `update devices set last_seen_at=now(),
        agent_version=coalesce($2, agent_version), windows_user=coalesce($3, windows_user)
      where id=$1`,
    [dev.id, body?.agent_version ? String(body.agent_version).slice(0, 40) : null, body?.windows_user ? String(body.windows_user).slice(0, 120) : null]
  );

  return NextResponse.json({
    accepted: rows.length,
    rejected: sessions.length - rows.length,
    policy: { collect_window_titles: keepTitles, collect_sites: keepSites, idle_mode: org?.idle_mode ?? "clicks", idle_threshold_seconds: 300, flush_interval_seconds: 60 },
  });
}
