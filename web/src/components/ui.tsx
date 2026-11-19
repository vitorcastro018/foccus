import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/format";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function PeriodTabs({ base, days }: { base: string; days: number }) {
  const opts = [
    { d: 1, l: "Hoje" },
    { d: 7, l: "7 dias" },
    { d: 30, l: "30 dias" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-line bg-panel p-1">
      {opts.map((o) => (
        <Link
          key={o.d}
          href={`${base}?d=${o.d}`}
          className={`rounded-md px-3 py-1.5 text-sm transition ${
            days === o.d ? "bg-brand text-white" : "text-muted hover:text-white"
          }`}
        >
          {o.l}
        </Link>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={`h-2 w-2 rounded-full ${online ? "bg-good shadow-[0_0_8px_#34d399]" : "bg-slate-600"}`} />
      <span className={online ? "text-good" : "text-muted"}>{online ? "Online" : "Offline"}</span>
    </span>
  );
}

const CAT_STYLE: Record<string, string> = {
  productive: "bg-good/15 text-good",
  neutral: "bg-slate-500/15 text-slate-300",
  unproductive: "bg-bad/15 text-bad",
};
export function CategoryBadge({ category }: { category: string | null }) {
  const c = category ?? "neutral";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CAT_STYLE[c]}`}>{CATEGORY_LABEL[c]}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</div>;
}
