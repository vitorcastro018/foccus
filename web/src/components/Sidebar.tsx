"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { logout } from "@/app/login/actions";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/devices", label: "Máquinas", icon: "M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zm5 13h6m-3-2v2" },
  { href: "/apps", label: "Aplicativos", icon: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 3h7m-3.5-3.5v7" },
  { href: "/sites", label: "Sites", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zm0-18c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21m0-18C9.5 5.5 8.2 8.5 8.2 12S9.5 18.5 12 21M3.5 9h17M3.5 15h17" },
  { href: "/settings", label: "Configurações", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 00-2-1.2L14.5 3h-4l-.4 2.6a7.5 7.5 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 002 1.2l.4 2.6h4l.4-2.6a7.5 7.5 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" },
];

export function Sidebar({ email }: { email: string }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-panel px-4 py-6 md:flex">
      <div className="px-2"><Logo /></div>
      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((i) => {
          const active = path === i.href || path.startsWith(i.href + "/");
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-brand/15 text-white" : "text-muted hover:bg-panel2 hover:text-white"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={i.icon} />
              </svg>
              {i.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line pt-4">
        <p className="truncate px-2 text-xs text-muted">{email}</p>
        <form action={logout}>
          <button className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-panel2 hover:text-white">Sair</button>
        </form>
      </div>
    </aside>
  );
}
