'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Avatar } from '@/components/ui/Avatar';
import { IconTheme, IconChevronDown, IconProfile, IconLogout } from '@/components/ui/icons';
import { MobileNavMenu } from './MobileNavMenu';

type TopBarProps = {
  userName: string;
  userImage?: string | null;
};

export function TopBar({ userName, userImage }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line px-5">
      {/* Hamburger — só abaixo de md:, mesmos destinos da Sidebar principal */}
      <MobileNavMenu />
      <div className="flex-1" />

      {/* Theme toggle (decorative) */}
      <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-ink">
        <IconTheme size={16} />
      </button>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-raised"
        >
          <Avatar name={userName || '?'} src={userImage} size="sm" />
          <span className="text-sm font-medium text-ink">{userName}</span>
          <IconChevronDown size={14} className="text-muted" />
        </button>

        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-line bg-raised p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <a
              href="/profile"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-ink transition-colors hover:bg-[color-mix(in_oklch,var(--ml-ink)_8%,transparent)]"
            >
              <IconProfile size={14} />
              Perfil
            </a>
            <div className="my-1 h-px bg-line" />
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10"
            >
              <IconLogout size={14} />
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
