export function fmtDuration(sec: number) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m`;
  return `${sec}s`;
}

export function fmtAgo(d: Date | string | null) {
  if (!d) return "nunca";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return `há ${Math.floor(s / 86400)} d`;
}

export function appLabel(name: string) {
  return name.replace(/\.exe$/i, "");
}

export const CATEGORY_LABEL: Record<string, string> = {
  productive: "Produtivo",
  neutral: "Neutro",
  unproductive: "Improdutivo",
};
