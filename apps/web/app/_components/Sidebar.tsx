'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  groups: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
};

// Novas entradas voltam aqui conforme as páginas forem reconstruídas
// (perfil, suporte, admin…). Nunca linkar rota que não existe.
const NAV_MAIN = [
  { label: 'Início', href: '/inicio', icon: 'home', match: (p: string) => p === '/inicio' || p === '/' },
  { label: 'Grupos', href: '/groups', icon: 'groups', match: (p: string) => p.startsWith('/groups') },
];

const itemBase =
  'mx-2 my-px flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors';
const itemIdle =
  'text-muted hover:bg-[color-mix(in_oklch,var(--ml-ink)_6%,transparent)] hover:text-ink';
const itemActive =
  'bg-[color-mix(in_oklch,var(--ml-accent)_12%,transparent)] font-medium text-accent';

export function Sidebar({ isAdmin: _isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

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
        {NAV_MAIN.map((item) => {
          const isActive = item.match(pathname);
          return (
            <Link key={item.href} href={item.href} className={cn(itemBase, isActive ? itemActive : itemIdle)}>
              <span className={cn('flex shrink-0', isActive ? 'text-accent' : 'text-faint')}>
                {ICON[item.icon]}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
