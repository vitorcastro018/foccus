import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const s = requireSession();
  return (
    <div className="flex min-h-screen">
      <Sidebar email={s.email} />
      <div className="min-w-0 flex-1">
        <nav className="flex gap-4 border-b border-line bg-panel px-4 py-3 text-sm md:hidden">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/devices">Máquinas</Link>
          <Link href="/apps">Apps</Link>
          <Link href="/settings">Config</Link>
        </nav>
        <main className="mx-auto max-w-7xl p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
