"use server";

import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function setCategory(fd: FormData) {
  const s = requireSession();
  if (s.role === "viewer") return;
  const process = String(fd.get("process") ?? "");
  const category = String(fd.get("category") ?? "");
  if (!process || !["productive", "neutral", "unproductive"].includes(category)) return;
  await q(
    `insert into app_catalog(org_id, process_name, category) values($1,$2,$3)
     on conflict (org_id, process_name) do update set category = excluded.category`,
    [s.orgId, process, category]
  );
  revalidatePath("/apps");
  revalidatePath("/dashboard");
}
