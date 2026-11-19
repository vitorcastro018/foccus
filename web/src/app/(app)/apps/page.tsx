import { requireSession } from "@/lib/auth";
import { appsCatalog, parseDays } from "@/lib/queries";
import { appLabel, fmtDuration } from "@/lib/format";
import { Empty, PageHeader, PeriodTabs } from "@/components/ui";
import { setCategory } from "./actions";

const OPTIONS = [
  { v: "productive", l: "Produtivo" },
  { v: "neutral", l: "Neutro" },
  { v: "unproductive", l: "Improdutivo" },
];

export default async function Apps({ searchParams }: { searchParams: { d?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  const rows = await appsCatalog(s.orgId, days);

  return (
    <>
      <PageHeader
        title="Aplicativos"
        subtitle="Classifique cada app para calcular a produtividade da equipe."
        right={<PeriodTabs base="/apps" days={days} />}
      />
      {rows.length === 0 ? (
        <Empty>Nenhum aplicativo registrado no período.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Aplicativo</th>
                <th className="th">Tempo ativo</th>
                <th className="th">Máquinas</th>
                <th className="th">Categoria</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.process_name} className="hover:bg-panel2">
                  <td className="td font-medium">{appLabel(a.process_name)}</td>
                  <td className="td tabular-nums">{fmtDuration(Number(a.seconds))}</td>
                  <td className="td text-muted">{a.devices}</td>
                  <td className="td">
                    <form action={setCategory} className="flex gap-1">
                      <input type="hidden" name="process" value={a.process_name} />
                      {OPTIONS.map((o) => {
                        const current = (a.category ?? "neutral") === o.v;
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
