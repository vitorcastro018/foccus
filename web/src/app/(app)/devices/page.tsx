import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { devicesList, parseDays } from "@/lib/queries";
import { fmtAgo, fmtDuration } from "@/lib/format";
import { Empty, PageHeader, PeriodTabs, StatusDot } from "@/components/ui";

export default async function Devices({ searchParams }: { searchParams: { d?: string } }) {
  const s = requireSession();
  const days = parseDays(searchParams.d);
  const rows = await devicesList(s.orgId, days);

  return (
    <>
      <PageHeader title="Máquinas" subtitle={`${rows.length} máquina(s) registrada(s).`} right={<PeriodTabs base="/devices" days={days} />} />
      {rows.length === 0 ? (
        <Empty>
          Nenhuma máquina ainda. <Link href="/settings" className="text-brand2 underline">Gere um token de instalação</Link>.
        </Empty>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-line">
              <tr>
                <th className="th">Máquina</th>
                <th className="th">Usuário</th>
                <th className="th">Status</th>
                <th className="th">Ativo</th>
                <th className="th">Ocioso</th>
                <th className="th">Agente</th>
                <th className="th">Visto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => (
                <tr key={d.id} className="transition hover:bg-panel2">
                  <td className="td font-medium">
                    <Link href={`/devices/${d.id}?d=${days}`} className="hover:text-brand2">{d.hostname}</Link>
                  </td>
                  <td className="td text-muted">{d.windows_user ?? "—"}</td>
                  <td className="td"><StatusDot online={!!d.online} /></td>
                  <td className="td tabular-nums">{fmtDuration(Number(d.active))}</td>
                  <td className="td tabular-nums text-muted">{fmtDuration(Number(d.idle))}</td>
                  <td className="td text-muted">{d.agent_version ?? "—"}</td>
                  <td className="td text-muted">{fmtAgo(d.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
