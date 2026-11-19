import { createHmac, randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { q } from "./db";

const COOKIE = "foccus_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET ausente ou curto (mín. 16 chars)");
  return s;
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const h = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString("hex")}$${h.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const h = scryptSync(pw, Buffer.from(saltHex, "hex"), 64);
  const exp = Buffer.from(hashHex, "hex");
  return h.length === exp.length && timingSafeEqual(h, exp);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type Session = { userId: string; orgId: string; email: string; role: string };

export function setSession(s: Session) {
  const body = Buffer.from(JSON.stringify({ ...s, exp: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  cookies().set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export function clearSession() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

export function getSession(): Session | null {
  const v = cookies().get(COOKIE)?.value;
  if (!v) return null;
  const [body, sig] = v.split(".");
  if (!body || !sig) return null;
  const exp = sign(body);
  if (exp.length !== sig.length || !timingSafeEqual(Buffer.from(exp), Buffer.from(sig))) return null;
  try {
    const d = JSON.parse(Buffer.from(body, "base64url").toString());
    if (d.exp < Date.now()) return null;
    return { userId: d.userId, orgId: d.orgId, email: d.email, role: d.role };
  } catch {
    return null;
  }
}

export function requireSession(): Session {
  const s = getSession();
  if (!s) redirect("/login");
  return s;
}

export async function hasAnyUser() {
  const r = await q<{ n: string }>("select count(*)::text n from users");
  return Number(r[0].n) > 0;
}
