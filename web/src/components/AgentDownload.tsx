export function AgentDownload({ compact = false }: { compact?: boolean }) {
  return (
    <a href="/api/download/agent" className="btn" download>
      ⬇ Baixar agente para Windows{compact ? "" : " (Foccus.exe)"}
    </a>
  );
}
