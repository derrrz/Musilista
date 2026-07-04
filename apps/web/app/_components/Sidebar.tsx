'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { IconHome, IconGroups, IconEditor, IconSupport, IconProfile, IconAdmin, IconRoadmap } from '@/components/ui/icons';

const ICON: Record<string, React.ReactNode> = {
  home: <IconHome />,
  groups: <IconGroups />,
  editor: <IconEditor />,
  support: <IconSupport />,
  profile: <IconProfile />,
  admin: <IconAdmin />,
  roadmap: <IconRoadmap />,
};

// Novas entradas voltam aqui conforme as páginas forem reconstruídas
// (perfil, suporte, admin…). Nunca linkar rota que não existe.
const NAV_MAIN = [
  { label: 'Início', href: '/', icon: 'home', match: (p: string) => p === '/' },
  { label: 'Grupos', href: '/groups', icon: 'groups', match: (p: string) => p.startsWith('/groups') },
  { label: 'Editor', href: '/editor', icon: 'editor', match: (p: string) => p.startsWith('/editor') },
];

const NAV_BETA = [
  { label: 'Roadmap', href: '/roadmap', icon: 'roadmap', match: (p: string) => p === '/roadmap' },
  { label: 'Suporte', href: '/support', icon: 'support', match: (p: string) => p.startsWith('/support') },
];

const NAV_BETA_AFTER_DIVIDER = [
  { label: 'Admin', href: '/admin', icon: 'admin', match: (p: string) => p.startsWith('/admin') },
];

const itemBase =
  'mx-2 my-px flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors';
const itemIdle =
  'text-muted hover:bg-[color-mix(in_oklch,var(--ml-ink)_6%,transparent)] hover:text-ink';
const itemActive =
  'bg-[color-mix(in_oklch,var(--ml-accent)_12%,transparent)] font-medium text-accent';

// Desktop-only — no mobile a navegação é a MobileTabBar (espelha as 3 abas
// do app nativo), que não tem Editor/Roadmap/Suporte/Admin porque essas
// páginas não existem lá.
export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] shrink-0 flex-col overflow-y-auto border-r border-line bg-raised md:flex">
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
            <div className="mx-4 my-2 border-t border-line" />
            {NAV_BETA_AFTER_DIVIDER.map((item) => {
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
