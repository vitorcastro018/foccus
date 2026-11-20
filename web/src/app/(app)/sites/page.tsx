import { requireSession } from "@/lib/auth";
import { q } from "@/lib/db";
import { parseDays } from "@/lib/queries";
import { topSites } from "@/lib/analytics";
import { fmtDuration } from "@/lib/format";
import { Empty, PageHeader, PeriodTabs } from "@/components/ui";
import { setSiteCategory } from "./actions";

const OPTIONS = [
  { v: "productive", l: "Produtivo" },
  { v: "neutral", l: "Neutro" },
  { v: "unproductive", l: "Improdutivo" },
];

export default async function Sites({ searchParams }: { searchParams: { d?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  const [rows, [org]] = await Promise.all([
    topSites(s.orgId, days, undefined, 100),
    q<{ collect_sites: boolean }>("select collect_sites from organizations where id=$1", [s.orgId]),
  ]);

  return (
    <>
      <PageHeader
        title="Sites"
        subtitle="Domínios acessados no navegador (guia ativa). Classifique cada site para refinar a produtividade."
        right={<PeriodTabs base="/sites" days={days} />}
      />
      {!org.collect_sites && (
        <div className="mb-6 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
          A coleta de sites está desligada em <b>Configurações</b>. Nenhum site novo será registrado.
        </div>
      )}
      {rows.length === 0 ? (
        <Empty>
          Nenhum site registrado no período. O agente lê o domínio da barra de endereços do Chrome, Edge, Brave, Opera, Vivaldi e Firefox em foco.
        </Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Site</th>
                <th className="th">Tempo ativo</th>
                <th className="th">Máquinas</th>
                <th className="th">Categoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.domain} className="hover:bg-panel2">
                  <td className="td font-medium">{r.domain}</td>
                  <td className="td tabular-nums">{fmtDuration(r.seconds)}</td>
                  <td className="td text-muted">{r.machines}</td>
                  <td className="td">
                    <form action={setSiteCategory} className="flex gap-1">
                      <input type="hidden" name="domain" value={r.domain} />
                      {OPTIONS.map((o) => {
                        const current = (r.category ?? "neutral") === o.v;
                        return (
                          <button
                            key={o.v}
                            name="category"
                            value={o.v}
                            disabled={s.role === "viewer"}
                            className={`rounded-md px-2.5 py-1 text-xs transition ${
                              current
                                ? o.v === "productive" ? "bg-good/20 text-good"
                                : o.v === "unproductive" ? "bg-bad/20 text-bad"
                                : "bg-slate-500/25 text-slate-200"
                                : "text-muted hover:bg-panel2 hover:text-white"
                            }`}
                          >
                            {o.l}
                          </button>
                        );
                      })}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
