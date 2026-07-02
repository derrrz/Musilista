'use client';

import { useEffect } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  title?: string;
}

export function Modal({ onClose, title, className, children, ...props }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-full max-w-md rounded-xl border border-line bg-raised p-8', className)}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {title && <h2 className="mb-6 text-xl font-bold tracking-tight text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
