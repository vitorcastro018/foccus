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

/* ───────── Gráficos de análise ───────── */

const C = { brand: "#7c5cff", brand2: "#a78bfa", good: "#34d399", bad: "#f87171", slate: "#64748b" };

/** Colunas empilhadas: ativo (roxo) + ocioso (cinza), com linhas de grade e eixo em horas. */
export function StackedBars({ data }: { data: { label: string; a: number; i: number }[] }) {
  const max = Math.max(60, ...data.map((d) => d.a + d.i));
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  if (data.every((d) => d.a + d.i === 0)) return <p className="py-16 text-center text-sm text-muted">Sem dados no período.</p>;
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-52 flex-col justify-between pb-0 text-right text-[10px] tabular-nums text-muted">
          {ticks.map((t) => <span key={t}>{fmtDuration(max * t)}</span>)}
        </div>
        <div className="relative h-52 flex-1">
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((t) => <div key={t} className="border-t border-line/70" />)}
          </div>
          <div className="relative flex h-full items-end gap-1">
            {data.map((d) => (
              <div key={d.label} className="group flex h-full flex-1 flex-col justify-end" title={`${d.label} — ativo ${fmtDuration(d.a)} · ocioso ${fmtDuration(d.i)}`}>
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: `${((d.a + d.i) / max) * 100}%` }}>
                  <div style={{ height: `${d.a + d.i ? (d.i / (d.a + d.i)) * 100 : 0}%`, background: C.slate, opacity: 0.55 }} />
                  <div className="transition group-hover:brightness-125" style={{ flex: 1, background: `linear-gradient(to top, ${C.brand}, ${C.brand2})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-[3.2rem] mt-2 flex gap-1">
        {data.map((d, i) => (
          <span key={d.label} className="flex-1 text-center text-[10px] text-muted">{data.length > 16 && i % 2 ? "" : d.label}</span>
        ))}
      </div>
      <Legend items={[{ c: C.brand2, l: "Ativo" }, { c: C.slate, l: "Ocioso" }]} />
    </div>
  );
}

export function Legend({ items }: { items: { c: string; l: string }[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
      {items.map((i) => (
        <span key={i.l} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.c }} />{i.l}</span>
      ))}
    </div>
  );
}

/** Linhas de tendência em % (0–100). Vários traços, mesma escala. */
export function LineChart({ labels, lines }: { labels: string[]; lines: { name: string; color: string; values: (number | null)[] }[] }) {
  const W = 600, H = 200, n = labels.length;
  const x = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - (Math.min(100, Math.max(0, v)) / 100) * H;
  if (lines.every((l) => l.values.every((v) => v == null))) return <p className="py-16 text-center text-sm text-muted">Sem dados no período.</p>;
  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `; pen = true; });
    return d;
  };
  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-[200px] flex-col justify-between text-right text-[10px] tabular-nums text-muted">
          {[100, 75, 50, 25, 0].map((t) => <span key={t}>{t}%</span>)}
        </div>
        <div className="relative h-[200px] flex-1">
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3, 4].map((t) => <div key={t} className="border-t border-line/70" />)}
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="relative h-full w-full overflow-visible">
            {lines.map((l) => (
              <path key={l.name} d={path(l.values)} fill="none" stroke={l.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div className="absolute inset-0 flex">
            {labels.map((lb, i) => (
              <div key={lb + i} className="h-full flex-1 hover:bg-white/5"
                title={`${lb} — ${lines.map((l) => `${l.name}: ${l.values[i] == null ? "—" : Math.round(l.values[i]!) + "%"}`).join(" · ")}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="ml-[2.6rem] mt-2 flex">
        {labels.map((lb, i) => <span key={lb + i} className="flex-1 text-center text-[10px] text-muted">{labels.length > 16 && i % 2 ? "" : lb}</span>)}
      </div>
      <Legend items={lines.map((l) => ({ c: l.color, l: l.name }))} />
    </div>
  );
}

/** Rosca com o total no centro. */
export function Donut({ parts, centerLabel }: { parts: { label: string; value: number; color: string }[]; centerLabel: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (total === 0) return <p className="py-10 text-center text-sm text-muted">Sem dados no período.</p>;
  const R = 52, CIRC = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#171b24" strokeWidth="16" />
        {parts.filter((p) => p.value > 0).map((p) => {
          const len = (p.value / total) * CIRC;
          const el = (
            <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth="16"
              strokeDasharray={`${Math.max(0, len - 1.5)} ${CIRC}`} strokeDashoffset={-acc}>
              <title>{`${p.label}: ${fmtDuration(p.value)}`}</title>
            </circle>
          );
          acc += len;
          return el;
        })}
        <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
          <text x="70" y="68" textAnchor="middle" fill="#e6e9f2" fontSize="20" fontWeight="600">{centerLabel}</text>
          <text x="70" y="84" textAnchor="middle" fill="#8b93a7" fontSize="9">produtivo</text>
        </g>
      </svg>
      <ul className="w-full space-y-2.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>
            <span className="tabular-nums text-muted">{fmtDuration(p.value)} · {Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** Mapa de calor: dia da semana x hora. Intensidade = tempo ativo. */
export function Heatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(...matrix.flat());
  if (max <= 0) return <p className="py-10 text-center text-sm text-muted">Sem dados nos últimos 30 dias.</p>;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="mb-1 ml-10 grid grid-cols-24 gap-[3px] text-center text-[10px] text-muted" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>
          {Array.from({ length: 24 }, (_, h) => <span key={h}>{h % 3 === 0 ? String(h).padStart(2, "0") : ""}</span>)}
        </div>
        {order.map((d) => (
          <div key={d} className="mb-[3px] flex items-center gap-2">
            <span className="w-8 text-right text-[11px] text-muted">{DOW[d]}</span>
            <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: "repeat(24, minmax(0,1fr))" }}>
              {matrix[d].map((v, h) => (
                <div key={h} className="aspect-square rounded-[4px]"
                  title={`${DOW[d]} ${String(h).padStart(2, "0")}h — ${fmtDuration(v)}`}
                  style={{ background: v > 0 ? C.brand : "#171b24", opacity: v > 0 ? 0.15 + 0.85 * (v / max) : 1 }} />
              ))}
            </div>
          </div>
        ))}
        <div className="ml-10 mt-3 flex items-center gap-2 text-[11px] text-muted">
          menos
          {[0.15, 0.35, 0.6, 0.8, 1].map((o) => <span key={o} className="h-3 w-5 rounded-sm" style={{ background: C.brand, opacity: o }} />)}
          mais · últimos 30 dias
        </div>
      </div>
    </div>
  );
}

/** Barras horizontais empilhadas por máquina: produtivo / neutro / improdutivo. */
export function MachinesStack({ rows, days }: {
  rows: { id: string; hostname: string; productive: number; neutral: number; unproductive: number }[]; days: number;
}) {
  const max = Math.max(1, ...rows.map((r) => r.productive + r.neutral + r.unproductive));
  if (rows.every((r) => r.productive + r.neutral + r.unproductive === 0)) return <p className="py-10 text-center text-sm text-muted">Sem dados no período.</p>;
  return (
    <div>
      <ul className="space-y-3">
        {rows.map((r) => {
          const t = r.productive + r.neutral + r.unproductive;
          return (
            <li key={r.id}>
              <a href={`/devices/${r.id}?d=${days}`} className="group block">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="truncate group-hover:text-brand2">{r.hostname}</span>
                  <span className="tabular-nums text-muted">{fmtDuration(t)}</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-panel2" style={{ width: `${Math.max(4, (t / max) * 100)}%` }}
                  title={`Produtivo ${fmtDuration(r.productive)} · Neutro ${fmtDuration(r.neutral)} · Improdutivo ${fmtDuration(r.unproductive)}`}>
                  <div style={{ width: `${t ? (r.productive / t) * 100 : 0}%`, background: C.good }} />
                  <div style={{ width: `${t ? (r.neutral / t) * 100 : 0}%`, background: C.slate }} />
                  <div style={{ width: `${t ? (r.unproductive / t) * 100 : 0}%`, background: C.bad }} />
                </div>
              </a>
            </li>
          );
        })}
      </ul>
      <Legend items={[{ c: C.good, l: "Produtivo" }, { c: C.slate, l: "Neutro" }, { c: C.bad, l: "Improdutivo" }]} />
    </div>
  );
}

const LANE = ["#7c5cff", "#34d399", "#f59e0b", "#38bdf8", "#f472b6", "#a3e635", "#fb923c", "#2dd4bf"];
const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;

/** Linha do tempo do dia: uma faixa por aplicativo ao longo de 24h. */
export function DayTimeline({ segs }: { segs: { process_name: string; smin: number; emin: number; active: number; idle: number }[] }) {
  if (segs.length === 0) return <p className="py-10 text-center text-sm text-muted">Sem atividade neste dia.</p>;
  const totals = new Map<string, number>();
  for (const s of segs) totals.set(s.process_name, (totals.get(s.process_name) ?? 0) + s.active);
  const lanes = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n);
  const first = Math.max(0, Math.floor(Math.min(...segs.map((s) => s.smin)) / 60) * 60 - 60);
  const last = Math.min(1440, Math.ceil(Math.max(...segs.map((s) => s.emin)) / 60) * 60 + 60);
  const span = Math.max(180, last - first);
  const pos = (m: number) => ((m - first) / span) * 100;
  const hours: number[] = [];
  for (let m = Math.ceil(first / 60) * 60; m <= first + span; m += span > 600 ? 120 : 60) hours.push(m);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="relative ml-28 mr-4 h-5 text-[10px] text-muted">
          {hours.map((m) => <span key={m} className="absolute -translate-x-1/2" style={{ left: `${pos(m)}%` }}>{String(m / 60).padStart(2, "0")}h</span>)}
        </div>
        {lanes.map((name, li) => (
          <div key={name} className="flex items-center gap-2 py-1">
            <span className="w-26 w-[6.5rem] shrink-0 truncate text-right text-xs text-muted">{name.replace(/\.exe$/i, "")}</span>
            <div className="relative mr-4 h-5 flex-1 rounded bg-panel2">
              {hours.map((m) => <span key={m} className="absolute top-0 h-full border-l border-line/60" style={{ left: `${pos(m)}%` }} />)}
              {segs.filter((s) => s.process_name === name).map((s, i) => (
                <span key={i} className="absolute top-0.5 h-4 rounded-sm"
                  title={`${name} · ${hh(s.smin)}–${hh(s.emin)} · ativo ${fmtDuration(s.active)}${s.idle ? ` · ocioso ${fmtDuration(s.idle)}` : ""}`}
                  style={{ left: `${pos(s.smin)}%`, width: `${Math.max(0.35, pos(s.emin) - pos(s.smin))}%`, background: LANE[li % LANE.length], opacity: s.idle > s.active ? 0.4 : 0.95 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Jornada por dia: faixa da primeira à última atividade. */
export function Workdays({ rows }: { rows: { day: string; first: number; last: number; active: number }[] }) {
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-muted">Sem dados no período.</p>;
  const lo = Math.max(0, Math.floor(Math.min(...rows.map((r) => r.first)) / 60) * 60 - 30);
  const hi = Math.min(1440, Math.ceil(Math.max(...rows.map((r) => r.last)) / 60) * 60 + 30);
  const span = Math.max(240, hi - lo);
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.day} className="flex items-center gap-3 text-xs">
          <span className="w-12 shrink-0 text-muted">{r.day.slice(8)}/{r.day.slice(5, 7)}</span>
          <div className="relative h-3.5 flex-1 rounded bg-panel2" title={`${hh(r.first)} → ${hh(r.last)} · ativo ${fmtDuration(r.active)}`}>
            <span className="absolute top-0 h-full rounded bg-gradient-to-r from-brand to-brand2"
              style={{ left: `${((r.first - lo) / span) * 100}%`, width: `${Math.max(1, ((r.last - r.first) / span) * 100)}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right tabular-nums text-muted">{hh(r.first)}–{hh(r.last)}</span>
        </li>
      ))}
    </ul>
  );
}
