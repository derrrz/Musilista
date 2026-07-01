import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeVariant = 'neutral' | 'accent' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'border-line bg-raised text-muted',
  accent: 'border-accent bg-accent text-accent-ink',
  outline: 'border-accent bg-transparent text-accent',
};

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5',
        'font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
