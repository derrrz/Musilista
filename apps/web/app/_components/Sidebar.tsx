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
  editor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  support: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <path d="M12 17h.01"/>
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
};

// Novas entradas voltam aqui conforme as páginas forem reconstruídas
// (perfil, suporte, admin…). Nunca linkar rota que não existe.
const NAV_MAIN = [
  { label: 'Início', href: '/inicio', icon: 'home', match: (p: string) => p === '/inicio' || p === '/' },
  { label: 'Grupos', href: '/groups', icon: 'groups', match: (p: string) => p.startsWith('/groups') },
  { label: 'Editor', href: '/editor', icon: 'editor', match: (p: string) => p.startsWith('/editor') },
  { label: 'Suporte', href: '/support', icon: 'support', match: (p: string) => p.startsWith('/support') },
];

const NAV_BETA = [
  { label: 'Roadmap', href: '/roadmap', icon: 'roadmap', match: (p: string) => p === '/roadmap' },
];

const itemBase =
  'mx-2 my-px flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors';
const itemIdle =
  'text-muted hover:bg-[color-mix(in_oklch,var(--ml-ink)_6%,transparent)] hover:text-ink';
const itemActive =
  'bg-[color-mix(in_oklch,var(--ml-accent)_12%,transparent)] font-medium text-accent';

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
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

        {isAdmin && (
          <>
            <div className="mt-1 px-5 pb-1 pt-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Beta Test
              </span>
            </div>
            {NAV_BETA.map((item) => {
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
          </>
        )}
      </nav>
    </aside>
  );
}
