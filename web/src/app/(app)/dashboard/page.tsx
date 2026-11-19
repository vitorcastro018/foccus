import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { dashboardData, parseDays } from "@/lib/queries";
import { appLabel, fmtAgo, fmtDuration } from "@/lib/format";
import { PageHeader, PeriodTabs, Stat, CategoryBadge, StatusDot, Empty } from "@/components/ui";
import { BarSeries, HBars, SplitBar } from "@/components/charts";

export default async function Dashboard({ searchParams }: { searchParams: { d?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  const { kpi, dev, topApps, categories, topDevices, series } = await dashboardData(s.orgId, days);

  const active = Number(kpi.active);
  const idle = Number(kpi.idle);
  const total = active + idle;
  const focus = total > 0 ? Math.round((active / total) * 100) : 0;
  const cat = (c: string) => Number(categories.find((x) => x.category === c)?.seconds ?? 0);
  const noDevices = Number(dev.total) === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do uso de aplicativos na sua equipe."
        right={<PeriodTabs base="/dashboard" days={days} />}
      />

      {noDevices && (
        <div className="mb-8">
          <Empty>
            Nenhuma máquina conectada ainda.{" "}
            <Link href="/settings" className="text-brand2 underline">Gere um token de instalação</Link> para registrar o primeiro agente.
          </Empty>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Máquinas online" value={`${dev.online}/${dev.total}`} hint="Ativas nos últimos 5 minutos" tone={Number(dev.online) > 0 ? "good" : undefined} />
        <Stat label="Tempo ativo" value={fmtDuration(active)} hint={`${kpi.machines_active} máquina(s) com atividade`} />
        <Stat label="Tempo ocioso" value={fmtDuration(idle)} hint="Sem teclado ou mouse" />
        <Stat label="Taxa de foco" value={`${focus}%`} hint="Ativo ÷ (ativo + ocioso)" tone={focus >= 70 ? "good" : focus > 0 ? "warn" : undefined} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-5 font-medium">{days === 1 ? "Atividade por hora" : "Atividade por dia"}</h2>
          <BarSeries data={series.map((p) => ({ label: p.label, value: Number(p.seconds) }))} />
        </div>
        <div className="card">
          <h2 className="mb-5 font-medium">Produtividade</h2>
          <SplitBar
            parts={[
              { label: "Produtivo", value: cat("productive"), color: "#34d399" },
              { label: "Neutro", value: cat("neutral"), color: "#64748b" },
              { label: "Improdutivo", value: cat("unproductive"), color: "#f87171" },
            ]}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-medium">Apps mais usados</h2>
            <Link href={`/apps?d=${days}`} className="text-sm text-brand2 hover:underline">Ver todos</Link>
          </div>
          <HBars
            rows={topApps.map((a) => ({
              label: appLabel(a.process_name),
              value: Number(a.seconds),
              sub: <CategoryBadge category={a.category} />,
            }))}
          />
        </div>

        <div className="card">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-medium">Máquinas mais ativas</h2>
            <Link href={`/devices?d=${days}`} className="text-sm text-brand2 hover:underline">Ver todas</Link>
          </div>
          {topDevices.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Sem máquinas.</p>
          ) : (
            <ul className="divide-y divide-line">
              {topDevices.map((d) => (
                <li key={d.id}>
                  <Link href={`/devices/${d.id}?d=${days}`} className="flex items-center justify-between gap-4 py-3 hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.hostname}</p>
                      <p className="truncate text-xs text-muted">{d.windows_user ?? "—"} · visto {fmtAgo(d.last_seen_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{fmtDuration(Number(d.seconds))}</p>
                      <StatusDot online={!!d.last_seen_at && Date.now() - new Date(d.last_seen_at).getTime() < 5 * 60_000} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
