'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/components/ui/cn';
import { IconMenu, IconHome, IconGroups, IconProfile } from '@/components/ui/icons';

// Espelha as 3 abas do app mobile nativo (Cifras/Grupos/Perfil) — mas como
// hamburger + menu (não barra fixa embaixo). Aparece tanto pra visitante
// anônimo quanto logado, já que o app mobile também funciona sem login.
const LINKS = [
  { label: 'Início', href: '/', icon: IconHome, match: (p: string) => p === '/' },
  { label: 'Grupos', href: '/groups', icon: IconGroups, match: (p: string) => p.startsWith('/groups') },
  { label: 'Perfil', href: '/profile', icon: IconProfile, match: (p: string) => p.startsWith('/profile') },
];

export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink"
        aria-label="Abrir menu"
      >
        <IconMenu size={18} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-line bg-raised p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {LINKS.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors',
                  isActive ? 'font-medium text-accent' : 'text-ink hover:bg-[color-mix(in_oklch,var(--ml-ink)_8%,transparent)]',
                )}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
