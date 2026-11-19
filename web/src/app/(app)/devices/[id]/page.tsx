import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { deviceDetail, parseDays, TZ } from "@/lib/queries";
import { appLabel, fmtAgo, fmtDuration } from "@/lib/format";
import { CategoryBadge, PageHeader, PeriodTabs, StatusDot } from "@/components/ui";
import { HBars } from "@/components/charts";

export default async function DevicePage({ params, searchParams }: { params: { id: string }; searchParams: { d?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const data = await deviceDetail(s.orgId, params.id, days);
  if (!data) notFound();
  const { device, apps, timeline } = data;
  const online = !!device.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() < 5 * 60_000;
  const fmtTime = (d: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

  return (
    <>
      <Link href="/devices" className="mb-4 inline-block text-sm text-muted hover:text-white">← Máquinas</Link>
      <PageHeader
        title={device.hostname}
        subtitle={`${device.windows_user ?? "usuário desconhecido"} · agente ${device.agent_version ?? "—"} · visto ${fmtAgo(device.last_seen_at)}`}
        right={
          <div className="flex items-center gap-4">
            <StatusDot online={online} />
            <PeriodTabs base={`/devices/${device.id}`} days={days} />
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-5 font-medium">Apps no período</h2>
          <HBars
            rows={apps.map((a) => ({
              label: appLabel(a.process_name),
              value: Number(a.active),
              sub: <CategoryBadge category={a.category} />,
            }))}
          />
        </div>
        <div className="card">
          <h2 className="mb-5 font-medium">Atividade recente</h2>
          {timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Sem atividade registrada.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
              {timeline.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{appLabel(t.process_name)}</p>
                    {t.window_title && <p className="truncate text-xs text-muted">{t.window_title}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs tabular-nums">{fmtDuration(t.active_seconds)}</p>
                    <p className="text-xs text-muted">{fmtTime(t.started_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
