import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { parseDays } from "@/lib/queries";
import { deviceOptions } from "@/lib/analytics";
import { PageHeader, PeriodTabs } from "@/components/ui";
import { Analytics } from "@/components/Analytics";
import { MachineSelect } from "@/components/MachineSelect";

export default async function Dashboard({ searchParams }: { searchParams: { d?: string; m?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  const devices = await deviceOptions(s.orgId);
  const selected = devices.find((d) => d.id === searchParams.m);

  return (
    <>
      <PageHeader
        title={selected ? `Dashboard · ${selected.hostname}` : "Dashboard"}
        subtitle={selected ? "Análise individual da máquina." : "Visão geral do uso de aplicativos e sites da sua equipe."}
        right={
          <div className="flex flex-wrap items-center gap-3">
            {selected && <Link href={`/devices/${selected.id}?d=${days}`} className="btn-ghost">Detalhes da máquina →</Link>}
            <MachineSelect devices={devices} current={selected?.id ?? ""} days={days} />
            <PeriodTabs base="/dashboard" days={days} extra={selected ? `m=${selected.id}` : undefined} />
          </div>
        }
      />
      {devices.length === 0 && (
        <div className="mb-8 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">
          Nenhuma máquina conectada ainda. <Link href="/settings" className="text-brand2 underline">Gere um token de instalação</Link> para registrar o primeiro agente.
        </div>
      )}
      <Analytics orgId={s.orgId} days={days} device={selected?.id} />
    </>
  );
}
