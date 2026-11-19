export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="14" stroke="#7c5cff" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="8" stroke="#a78bfa" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3" fill="#7c5cff" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">Foccus</span>
    </div>
  );
}
