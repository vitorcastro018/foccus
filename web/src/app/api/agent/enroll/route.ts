import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { sha256 } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Registro de uma máquina usando o token de instalação. Retorna a chave do dispositivo (uma única vez). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "");
  const hostname = String(body?.hostname ?? "").slice(0, 120);
  if (!token || !hostname) return NextResponse.json({ error: "token e hostname são obrigatórios" }, { status: 400 });

  const [t] = await q<{ org_id: string }>(
    `select org_id from enrollment_tokens
      where token_hash=$1 and not revoked and (expires_at is null or expires_at > now())`,
    [sha256(token)]
  );
  if (!t) return NextResponse.json({ error: "token inválido ou expirado" }, { status: 401 });

  const deviceKey = "fdk_" + randomBytes(32).toString("base64url");
  const [d] = await q<{ id: string }>(
    `insert into devices(org_id, hostname, windows_user, agent_version, device_key_hash, last_seen_at)
     values($1,$2,$3,$4,$5, now()) returning id`,
    [
      t.org_id, hostname,
      body?.windows_user ? String(body.windows_user).slice(0, 120) : null,
      body?.agent_version ? String(body.agent_version).slice(0, 40) : null,
      sha256(deviceKey),
    ]
  );
  return NextResponse.json({ device_id: d.id, device_key: deviceKey, policy: await policy(t.org_id) });
}

async function policy(orgId: string) {
  const [o] = await q<{ collect_window_titles: boolean; collect_sites: boolean }>("select collect_window_titles, collect_sites from organizations where id=$1", [orgId]);
  return { collect_window_titles: !!o?.collect_window_titles, collect_sites: !!o?.collect_sites, idle_threshold_seconds: 300, flush_interval_seconds: 60 };
}
