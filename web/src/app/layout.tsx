import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foccus",
  description: "Monitoramento de uso de aplicativos para equipes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg text-slate-100">{children}</body>
    </html>
  );
}
