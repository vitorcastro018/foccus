import { redirect } from "next/navigation";
import { getSession, hasAnyUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await hasAnyUser())) redirect("/setup");
  redirect(getSession() ? "/dashboard" : "/login");
}
