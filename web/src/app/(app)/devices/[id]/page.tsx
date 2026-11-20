import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { deviceDetail, parseDays, TZ } from "@/lib/queries";
import { dayTimeline, parseDay, shiftDay, todayLocal, workdays } from "@/lib/analytics";
import { appLabel, fmtAgo, fmtDuration } from "@/lib/format";
import { PageHeader, PeriodTabs, StatusDot } from "@/components/ui";
import { Analytics } from "@/components/Analytics";
import { DayTimeline, Workdays } from "@/components/charts";

export default async function DevicePage({ params, searchParams }: { params: { id: string }; searchParams: { d?: string; day?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const data = await deviceDetail(s.orgId, params.id, days);
  if (!data) notFound();
  const { device, timeline } = data;

  const day = parseDay(searchParams.day);
  const [segs, wd] = await Promise.all([dayTimeline(s.orgId, device.id, day), workdays(s.orgId, days === 1 ? 7 : days, device.id)]);

  const online = !!device.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() < 5 * 60_000;
  const fmtTime = (d: string) =>
    new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  const dayLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(day + "T12:00:00Z"));
  const qs = (dd: string) => `/devices/${device.id}?d=${days}&day=${dd}`;
  const isToday = day >= todayLocal();

  return (
    <>
      <Link href="/devices" className="mb-4 inline-block text-sm text-muted hover:text-white">← Máquinas</Link>
      <PageHeader
        title={device.hostname}
        subtitle={`${device.windows_user ?? "usuário desconhecido"} · agente ${device.agent_version ?? "—"} · visto ${fmtAgo(device.last_seen_at)}`}
        right={
          <div className="flex flex-wrap items-center gap-4">
            <StatusDot online={online} />
            <PeriodTabs base={`/devices/${device.id}`} days={days} />
          </div>
        }
      />

      <Analytics orgId={s.orgId} days={days} device={device.id} />

      <section className="card mt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium">Linha do tempo do dia <span className="ml-2 inline-block text-sm font-normal text-muted first-letter:uppercase">{dayLabel}</span></h2>
          <div className="flex gap-2">
            <Link href={qs(shiftDay(day, -1))} className="btn-ghost">← Dia anterior</Link>
            {!isToday && <Link href={qs(shiftDay(day, 1))} className="btn-ghost">Próximo dia →</Link>}
          </div>
        </div>
        <DayTimeline segs={segs} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-1 font-medium">Jornada</h2>
          <p className="mb-5 text-xs text-muted">Primeira e última atividade de cada dia ({days === 1 ? "últimos 7 dias" : "no período"}).</p>
          <Workdays rows={wd} />
        </div>
        <div className="card">
          <h2 className="mb-5 font-medium">Atividade recente</h2>
          {timeline.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Sem atividade registrada.</p>
          ) : (
            <ul className="max-h-[22rem] divide-y divide-line overflow-y-auto">
              {timeline.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{appLabel(t.process_name)}{t.site ? <span className="ml-2 text-xs text-brand2">{t.site}</span> : null}</p>
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
