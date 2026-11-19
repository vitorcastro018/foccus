import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { hasAnyUser } from "@/lib/auth";
import { setup } from "../login/actions";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/login");
  return (
    <AuthForm
      action={setup}
      withOrg
      title="Configuração inicial"
      subtitle="Crie sua empresa e o primeiro administrador."
      submit="Criar e entrar"
    />
  );
}
