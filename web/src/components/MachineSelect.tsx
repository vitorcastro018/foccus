"use client";

import { useRouter } from "next/navigation";

export function MachineSelect({ devices, current, days }: { devices: { id: string; hostname: string }[]; current: string; days: number }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/dashboard?d=${days}${e.target.value ? `&m=${e.target.value}` : ""}`)}
      className="rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-brand"
      aria-label="Filtrar por máquina"
    >
      <option value="">Todas as máquinas</option>
      {devices.map((d) => <option key={d.id} value={d.id}>{d.hostname}</option>)}
    </select>
  );
}
