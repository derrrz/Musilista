import type { LabelHTMLAttributes } from 'react';
import { cn } from './cn';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-[10px] font-medium uppercase tracking-[0.18em] text-muted', className)}
      {...props}
    />
  );
}
