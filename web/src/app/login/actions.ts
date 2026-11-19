"use server";

import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { clearSession, hashPassword, setSession, verifyPassword, hasAnyUser } from "@/lib/auth";

export async function login(_: unknown, fd: FormData) {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const [u] = await q<{ id: string; org_id: string; email: string; role: string; password_hash: string }>(
    "select id, org_id, email, role, password_hash from users where email=$1",
    [email]
  );
  if (!u || !verifyPassword(password, u.password_hash)) return { error: "Email ou senha inválidos." };
  setSession({ userId: u.id, orgId: u.org_id, email: u.email, role: u.role });
  redirect("/dashboard");
}

export async function setup(_: unknown, fd: FormData) {
  if (await hasAnyUser()) redirect("/login");
  const org = String(fd.get("org") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!org || !email.includes("@")) return { error: "Preencha empresa e email." };
  if (password.length < 8) return { error: "A senha precisa ter ao menos 8 caracteres." };
  const [o] = await q<{ id: string }>("insert into organizations(name) values($1) returning id", [org]);
  const [u] = await q<{ id: string }>(
    "insert into users(org_id,email,password_hash,role) values($1,$2,$3,'admin') returning id",
    [o.id, email, hashPassword(password)]
  );
  setSession({ userId: u.id, orgId: o.id, email, role: "admin" });
  redirect("/dashboard");
}

export async function logout() {
  clearSession();
  redirect("/login");
}
