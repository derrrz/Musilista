import { useId } from 'react';
import type { TextareaHTMLAttributes, Ref } from 'react';
import { cn } from './cn';
import { Label } from './Label';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <textarea
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-20 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink',
          'placeholder:text-faint',
          'transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500 focus:ring-red-500' : 'border-line focus:border-accent focus:ring-accent',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
