import { fmtDuration } from "@/lib/format";

/** Barras verticais simples (CSS), sem dependências. */
export function BarSeries({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted">Sem dados no período.</p>;
  return (
    <div className="flex h-48 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="group flex h-full flex-1 flex-col justify-end" title={`${d.label} — ${fmtDuration(d.value)}`}>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-brand/60 to-brand2 transition group-hover:from-brand group-hover:to-brand2"
            style={{ height: `${Math.max(3, (d.value / max) * 100)}%` }}
          />
          <span className="mt-2 text-center text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Barras horizontais com rótulo e valor. */
export function HBars({ rows }: { rows: { label: string; value: number; sub?: React.ReactNode }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="py-6 text-center text-sm text-muted">Sem dados no período.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 truncate">{r.label}{r.sub}</span>
            <span className="tabular-nums text-muted">{fmtDuration(r.value)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand2" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Divisão produtivo/neutro/improdutivo em barra empilhada. */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total === 0) return <p className="py-6 text-center text-sm text-muted">Sem dados no período.</p>;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-panel2">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.label}
            </span>
            <span className="tabular-nums text-muted">
              {fmtDuration(p.value)} · {Math.round((p.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
