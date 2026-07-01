'use client';

import { useState } from 'react';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';

const ICON: Record<string, React.ReactNode> = {
  home: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  explore: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  groups: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  integrations: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
      <path d="M7 7h.01"/>
    </svg>
  ),
  plans: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2"/>
      <path d="M2 10h20"/>
    </svg>
  ),
  roadmap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  support: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
    </svg>
  ),
};

const NAV_MAIN = [
  { label: 'Início', href: '/', icon: 'home' },
  { label: 'Grupos', href: '/groups', icon: 'groups' },
];

const NAV_BETA = [
  { label: 'Planos', href: '/planos', icon: 'plans' },
  { label: 'Roadmap', href: '/roadmap', icon: 'roadmap' },
  { label: 'Suporte', href: '/support', icon: 'support' },
];

const itemBase =
  'mx-2 my-px flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors';
const itemIdle =
  'text-muted hover:bg-[color-mix(in_oklch,var(--ml-ink)_6%,transparent)] hover:text-ink';
const itemActive =
  'bg-[color-mix(in_oklch,var(--ml-accent)_12%,transparent)] font-medium text-accent';

function NavItem({ label, href, icon, isActive }: { label: string; href: string; icon: string; isActive: boolean }) {
  return (
    <a href={href} className={cn(itemBase, isActive ? itemActive : itemIdle)}>
      <span className={cn('flex shrink-0', isActive ? 'text-accent' : 'text-faint')}>
        {ICON[icon]}
      </span>
      {label}
    </a>
  );
}

export function Sidebar({ active, isAdmin }: { active?: string; isAdmin?: boolean }) {
  const [intOpen, setIntOpen] = useState(false);
  const isGroupsActive = active?.startsWith('/groups');

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col overflow-y-auto border-r border-line bg-raised">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 pb-3 pt-4">
        <LogoMark size={22} />
        <Wordmark className="text-xs" />
        <Badge variant="outline">Beta</Badge>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-1">
        {NAV_MAIN.map((item) => (
          <NavItem
            key={item.href}
            label={item.label}
            href={item.href}
            icon={item.icon}
            isActive={item.href === '/groups' ? !!isGroupsActive : active === item.href}
          />
        ))}

        {/* Integrações with collapsible arrow */}
        <button
          onClick={() => setIntOpen((o) => !o)}
          className={cn(itemBase, itemIdle, 'w-[calc(100%-16px)] justify-between text-left')}
        >
          <span className="flex items-center gap-2.5">
            <span className="flex text-faint">{ICON.integrations}</span>
            Integrações
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={cn('transition-transform duration-200', intOpen && 'rotate-180')}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {isAdmin && (
          <>
            <div className="mt-1 px-5 pb-1 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Beta Test
              </span>
            </div>

            {NAV_BETA.map((item) => (
              <NavItem
                key={item.href}
                label={item.label}
                href={item.href}
                icon={item.icon}
                isActive={active === item.href}
              />
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
