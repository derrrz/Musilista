'use client';

import { useEffect, useState } from 'react';
import { IconTheme } from '@/components/ui/icons';

// Toggle real de tema: alterna data-theme no <html> e persiste no
// localStorage (o script no-flash do layout raiz lê na próxima visita).
export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light' | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' ? 'light' : 'dark');
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
      title={theme === 'light' ? 'Tema escuro' : 'Tema claro'}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink"
    >
      <IconTheme size={16} />
    </button>
  );
}
