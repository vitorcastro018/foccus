import { createReadStream, existsSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Onde procurar o Foccus.exe: variável, imagem Docker (/app/agent) ou build local (agent/dist). */
function agentPath() {
  const candidates = [
    process.env.AGENT_EXE_PATH,
    path.join(process.cwd(), "agent", "Foccus.exe"),
    path.join(process.cwd(), "..", "agent", "dist", "Foccus.exe"),
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p));
}

/** Download do agente Windows. Só para usuários logados no painel. */
export async function GET() {
  if (!getSession()) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const file = agentPath();
  if (!file) {
    return NextResponse.json(
      { error: "Agente não disponível neste servidor. Gere com agent/build.ps1 ou use a imagem Docker completa." },
      { status: 404 }
    );
  }
  const body = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.microsoft.portable-executable",
      "Content-Length": String(statSync(file).size),
      "Content-Disposition": 'attachment; filename="Foccus.exe"',
      "Cache-Control": "no-store",
    },
  });
}
