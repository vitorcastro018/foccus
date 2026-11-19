import { requireSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { fmtAgo } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { TokenGenerator } from "@/components/TokenGenerator";
import { revokeToken, saveOrg } from "./actions";

export default async function Settings() {
  const s = requireSession();
  const [org] = await q<{ name: string; retention_days: number; collect_window_titles: boolean }>(
    "select name, retention_days, collect_window_titles from organizations where id=$1",
    [s.orgId]
  );
  const tokens = await q<{ id: string; created_at: string; expires_at: string | null; revoked: boolean }>(
    "select id, created_at, expires_at, revoked from enrollment_tokens where org_id=$1 order by created_at desc limit 10",
    [s.orgId]
  );
  const admin = s.role === "admin";

  return (
    <>
      <PageHeader title="Configurações" subtitle={org.name} />

      <section className="card mb-6">
        <h2 className="font-medium">Token de instalação</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Use este token ao instalar o agente nas máquinas Windows para registrá-las na sua empresa.
        </p>
        {admin ? <TokenGenerator /> : <p className="text-sm text-muted">Apenas administradores podem gerar tokens.</p>}
        {tokens.length > 0 && (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {tokens.map((t) => {
              const expired = t.expires_at && new Date(t.expires_at) < new Date();
              return (
                <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-muted">
                    Criado {fmtAgo(t.created_at)} ·{" "}
                    {t.revoked ? <span className="text-bad">revogado</span>
                      : expired ? <span className="text-warn">expirado</span>
                      : t.expires_at ? `expira ${new Date(t.expires_at).toLocaleDateString("pt-BR")}` : "sem expiração"}
                  </span>
                  {admin && !t.revoked && (
                    <form action={revokeToken}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="btn-ghost">Revogar</button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="font-medium">Privacidade e retenção</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Controle o que o agente coleta. Recomendamos manter títulos de janela desligados.</p>
        <form action={saveOrg} className="space-y-4">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" name="titles" defaultChecked={org.collect_window_titles} disabled={!admin} className="h-4 w-4 accent-brand" />
            Coletar títulos de janela (podem conter dados sensíveis)
          </label>
          <div className="max-w-xs">
            <label className="label">Retenção dos dados (dias)</label>
            <input name="retention" type="number" min={7} defaultValue={org.retention_days} disabled={!admin} className="input mt-1" />
          </div>
          {admin && <button className="btn">Salvar</button>}
        </form>
      </section>
    </>
  );
}
