"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { requireSession, sha256 } from "@/lib/auth";

function requireAdmin() {
  const s = requireSession();
  if (s.role !== "admin") throw new Error("Apenas administradores.");
  return s;
}

export async function createToken(_: unknown, fd: FormData) {
  const s = requireAdmin();
  const days = Number(fd.get("days") ?? 7);
  const token = "fcc_" + randomBytes(24).toString("base64url");
  await q(
    `insert into enrollment_tokens(org_id, token_hash, expires_at)
     values($1,$2, case when $3::int > 0 then now() + ($3::int * interval '1 day') end)`,
    [s.orgId, sha256(token), days]
  );
  revalidatePath("/settings");
  return { token };
}

export async function revokeToken(fd: FormData) {
  const s = requireAdmin();
  await q("update enrollment_tokens set revoked=true where id=$1 and org_id=$2", [String(fd.get("id")), s.orgId]);
  revalidatePath("/settings");
}

export async function saveOrg(fd: FormData) {
  const s = requireAdmin();
  const titles = fd.get("titles") === "on";
  const sites = fd.get("sites") === "on";
  const retention = Math.min(3650, Math.max(7, Number(fd.get("retention") ?? 90) || 90));
  const idleMode = fd.get("idle_mode") === "clicks_keyboard" ? "clicks_keyboard" : "clicks";
  await q(
    "update organizations set collect_window_titles=$2, retention_days=$3, collect_sites=$4, idle_mode=$5 where id=$1",
    [s.orgId, titles, retention, sites, idleMode]
  );
  revalidatePath("/settings");
}
