import type { HTMLAttributes } from 'react';
import { cn } from './cn';

// Escala tipográfica do brand kit (DS/Musilista, direção Console):
// Eyebrow 10-11px/uppercase/tracking 0.14-0.18em, PageTitle 28px/600, Caption 11px/500/tracking 0.14em.

export function Eyebrow({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[10px] font-medium uppercase tracking-[0.18em] text-muted', className)}
      {...props}
    />
  );
}

export function PageTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn('text-[28px] font-semibold tracking-tight text-ink', className)}
      {...props}
    />
  );
}

export function Caption({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[11px] font-medium uppercase tracking-[0.14em] text-muted', className)}
      {...props}
    />
  );
}
