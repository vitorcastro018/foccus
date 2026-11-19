"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Logo } from "./Logo";

type Action = (state: any, fd: FormData) => Promise<{ error?: string } | void>;

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn w-full" disabled={pending}>
      {pending ? "Aguarde…" : label}
    </button>
  );
}

export function AuthForm({
  action, title, subtitle, submit, withOrg,
}: { action: Action; title: string; subtitle: string; submit: string; withOrg?: boolean }) {
  const [state, formAction] = useFormState(action, undefined as any);
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size={36} /></div>
        <form action={formAction} className="card space-y-4">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
          {withOrg && (
            <div>
              <label className="label">Empresa</label>
              <input name="org" required className="input mt-1" placeholder="Nome da empresa" />
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="input mt-1" placeholder="voce@empresa.com" autoComplete="username" />
          </div>
          <div>
            <label className="label">Senha</label>
            <input name="password" type="password" required className="input mt-1" autoComplete={withOrg ? "new-password" : "current-password"} />
          </div>
          {state?.error && <p className="text-sm text-bad">{state.error}</p>}
          <Submit label={submit} />
        </form>
      </div>
    </main>
  );
}
