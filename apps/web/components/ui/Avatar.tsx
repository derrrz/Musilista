import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  /** Nome usado para a inicial de fallback e para o texto alternativo da imagem. */
  name: string;
  src?: string | null;
  size?: AvatarSize;
  shape?: AvatarShape;
}

const sizes: Record<AvatarSize, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
};

const shapes: Record<AvatarShape, string> = {
  circle: 'rounded-full',
  square: 'rounded-lg',
};

export function Avatar({
  name,
  src,
  size = 'md',
  shape = 'circle',
  className,
  ...props
}: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden',
        'bg-accent font-semibold text-accent-ink',
        sizes[size],
        shapes[shape],
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar externo, dimensões fixas
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </span>
  );
}
