export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[var(--shadow-card)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <path d="M5 5v9a7 7 0 0 0 14 0V5" />
          <path d="M12 5v8" />
        </svg>
      </div>
      <span className="font-display text-lg font-semibold tracking-tight">Flowboard</span>
    </div>
  );
}
