import { cn } from '../ui/cn';

// Marca "Console" do brand kit: nota pixelada em escada ascendente.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="36" height="36" rx="6" className="fill-bg" />
      <rect x="20" y="8" width="4" height="20" rx="1" className="fill-accent" />
      <rect x="24" y="8" width="6" height="4" rx="1" className="fill-accent" />
      <rect x="26" y="12" width="6" height="4" rx="1" className="fill-accent opacity-75" />
      <rect x="28" y="16" width="4" height="4" rx="1" className="fill-accent opacity-50" />
      <rect x="11" y="24" width="11" height="8" rx="1.6" className="fill-accent" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold uppercase tracking-[0.18em] text-ink', className)}>
      Musilista
    </span>
  );
}

export function Logo({ markSize = 28, className }: { markSize?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={markSize} />
      <Wordmark className="text-sm" />
    </span>
  );
}
