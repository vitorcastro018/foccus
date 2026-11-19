import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { hasAnyUser } from "@/lib/auth";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await hasAnyUser())) redirect("/setup");
  return <AuthForm action={login} title="Entrar" subtitle="Acesse o painel do Foccus." submit="Entrar" />;
}
