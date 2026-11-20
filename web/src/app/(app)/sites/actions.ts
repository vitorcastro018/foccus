"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function setSiteCategory(fd: FormData) {
  const s = requireSession();
  if (s.role === "viewer") return;
  const domain = String(fd.get("domain") ?? "").toLowerCase().slice(0, 200);
  const category = String(fd.get("category") ?? "");
  if (!domain || !["productive", "neutral", "unproductive"].includes(category)) return;
  await q(
    `insert into site_catalog(org_id, domain, category) values($1,$2,$3)
     on conflict (org_id, domain) do update set category = excluded.category`,
    [s.orgId, domain, category]
  );
  revalidatePath("/sites");
  revalidatePath("/dashboard");
}
