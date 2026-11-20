import Link from "next/link";
import { q } from "@/lib/db";
import { ONLINE_WINDOW_MIN } from "@/lib/queries";
import { categories, heatmap, kpis, machineComparison, series, topApps, topSites } from "@/lib/analytics";
import { appLabel, fmtDuration } from "@/lib/format";
import { CategoryBadge, Stat } from "@/components/ui";
import { Donut, HBars, Heatmap, LineChart, MachinesStack, StackedBars } from "@/components/charts";

const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

function relDelta(cur: number, prev: number) {
  if (prev <= 0) return null;
  const v = ((cur - prev) / prev) * 100;
  return { text: `${Math.abs(Math.round(v))}%`, up: v >= 0 };
}
function ppDelta(cur: number, prev: number, hasPrev: boolean) {
  if (!hasPrev) return null;
  const v = cur - prev;
  return { text: `${Math.abs(Math.round(v))} p.p.`, up: v >= 0 };
}

function Card({ title, right, children, className = "" }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-medium">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Bloco de análise reutilizado no dashboard (equipe toda ou uma máquina) e na página da máquina. */
export async function Analytics({ orgId, days, device }: { orgId: string; days: number; device?: string }) {
  const [k, buckets, heat, apps, cats, sites, machines, online] = await Promise.all([
    kpis(orgId, days, device),
    series(orgId, days, device),
    heatmap(orgId, device),
    topApps(orgId, days, device),
    categories(orgId, days, device),
    topSites(orgId, days, device),
    device ? Promise.resolve([]) : machineComparison(orgId, days),
    device
      ? Promise.resolve(null)
      : q<{ total: string; online: string }>(
          `select count(*)::text total, count(*) filter (where last_seen_at > now() - interval '${ONLINE_WINDOW_MIN} minutes')::text online from devices where org_id=$1`,
          [orgId]
        ),
  ]);

  const focus = pct(k.a, k.a + k.i), pFocus = pct(k.pa, k.pa + k.pi);
  const prodShare = pct(k.prod, k.a), pProd = pct(k.pprod, k.pa);
  const hasPrev = k.pa + k.pi > 0;
  const periodWord = days === 1 ? "ontem" : "período anterior";

  const labels = buckets.map((b) => b.label);
  const focusLine = buckets.map((b) => (b.a + b.i > 0 ? pct(b.a, b.a + b.i) : null));
  const prodLine = buckets.map((b) => (b.a > 0 ? pct(b.prod, b.a) : null));

  return (
    <>
      <section className={`grid gap-4 sm:grid-cols-2 ${device ? "xl:grid-cols-4" : "xl:grid-cols-5"}`}>
        {online && (
          <Stat label="Máquinas online" value={`${online[0].online}/${online[0].total}`} hint="Últimos 5 min" tone={Number(online[0].online) > 0 ? "good" : undefined} />
        )}
        <Stat label="Tempo ativo" value={fmtDuration(k.a)} delta={relDelta(k.a, k.pa)} hint={`vs ${periodWord}`} />
        <Stat label="Tempo ocioso" value={fmtDuration(k.i)} delta={relDelta(k.i, k.pi) && { ...relDelta(k.i, k.pi)!, goodWhenUp: false }} hint={`vs ${periodWord}`} />
        <Stat label="Taxa de foco" value={`${Math.round(focus)}%`} tone={focus >= 70 ? "good" : focus > 0 ? "warn" : undefined} delta={ppDelta(focus, pFocus, hasPrev)} hint="ativo ÷ total" />
        <Stat label="Produtividade" value={`${Math.round(prodShare)}%`} tone={prodShare >= 50 ? "good" : prodShare > 0 ? "warn" : undefined} delta={ppDelta(prodShare, pProd, k.pa > 0)} hint="do tempo ativo" />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={days === 1 ? "Atividade por hora" : "Atividade por dia"} className="lg:col-span-2">
          <StackedBars data={buckets.map((b) => ({ label: b.label, a: b.a, i: b.i }))} />
        </Card>
        <Card title="Produtividade por categoria">
          <Donut
            centerLabel={`${Math.round(prodShare)}%`}
            parts={[
              { label: "Produtivo", value: cats.productive, color: "#34d399" },
              { label: "Neutro", value: cats.neutral, color: "#64748b" },
              { label: "Improdutivo", value: cats.unproductive, color: "#f87171" },
            ]}
          />
          <p className="mt-4 text-xs text-muted">Classifique apps e sites em <Link href="/apps" className="text-brand2 hover:underline">Aplicativos</Link> e <Link href="/sites" className="text-brand2 hover:underline">Sites</Link>.</p>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={days === 1 ? "Foco e produtividade por hora" : "Tendência de foco e produtividade"} className="lg:col-span-2">
          <LineChart
            labels={labels}
            lines={[
              { name: "Taxa de foco", color: "#a78bfa", values: focusLine },
              { name: "Produtividade", color: "#34d399", values: prodLine },
            ]}
          />
        </Card>
        <Card title="Sites mais acessados" right={<Link href={`/sites?d=${days}`} className="text-sm text-brand2 hover:underline">Ver todos</Link>}>
          {sites.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nenhum site no período. O agente lê o domínio do navegador em foco.</p>
          ) : (
            <HBars rows={sites.map((s) => ({ label: s.domain, value: s.seconds, sub: <CategoryBadge category={s.category} /> }))} />
          )}
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card title={device ? "Quando a máquina está ativa" : "Quando a equipe está ativa"} className="lg:col-span-2">
          <Heatmap matrix={heat} />
        </Card>
        <Card title="Apps mais usados" right={<Link href={`/apps?d=${days}`} className="text-sm text-brand2 hover:underline">Ver todos</Link>}>
          <HBars rows={apps.map((a) => ({ label: appLabel(a.process_name), value: a.seconds, sub: <CategoryBadge category={a.category} /> }))} />
        </Card>
      </section>

      {!device && (
        <section className="mt-6">
          <Card title="Comparativo entre máquinas" right={<Link href={`/devices?d=${days}`} className="text-sm text-brand2 hover:underline">Ver todas</Link>}>
            <p className="-mt-3 mb-5 text-xs text-muted">Clique em uma máquina para analisar individualmente.</p>
            <MachinesStack rows={machines} days={days} />
          </Card>
        </section>
      )}
    </>
  );
}
