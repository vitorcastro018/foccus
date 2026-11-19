"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createToken } from "@/app/(app)/settings/actions";

function Btn() {
  const { pending } = useFormStatus();
  return <button className="btn" disabled={pending}>{pending ? "Gerando…" : "Gerar token"}</button>;
}

export function TokenGenerator() {
  const [state, action] = useFormState(createToken, undefined as { token: string } | undefined);
  return (
    <div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Validade</label>
          <select name="days" className="input mt-1" defaultValue="7">
            <option value="1">1 dia</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="0">Sem expiração</option>
          </select>
        </div>
        <Btn />
      </form>
      {state?.token && (
        <div className="mt-4 rounded-xl border border-brand/40 bg-brand/10 p-4">
          <p className="text-sm font-medium">Token gerado — copie agora, ele não será exibido novamente.</p>
          <code className="mt-2 block break-all rounded-lg bg-bg p-3 text-sm text-brand2">{state.token}</code>
        </div>
      )}
    </div>
  );
}
