'use client';

import { useState } from 'react';

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

function NavItem({ label, href, icon, isActive }: { label: string; href: string; icon: string; isActive: boolean }) {
  return (
    <a
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        margin: '1px 8px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: isActive ? 500 : 400,
        color: isActive ? 'var(--ml-accent)' : 'var(--ml-muted)',
        background: isActive ? 'color-mix(in oklch, var(--ml-accent) 12%, transparent)' : 'transparent',
        textDecoration: 'none',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'color-mix(in oklch, var(--ml-ink) 6%, transparent)'; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ color: isActive ? 'var(--ml-accent)' : 'var(--ml-faint)', display: 'flex', flexShrink: 0 }}>
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
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: 'var(--ml-raised)',
      borderRight: '1px solid var(--ml-line)',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ml-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', color: 'var(--ml-ink)' }}>MUSILISTA</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
          background: 'color-mix(in oklch, var(--ml-accent) 15%, transparent)',
          border: '1px solid color-mix(in oklch, var(--ml-accent) 35%, transparent)',
          color: 'var(--ml-accent)',
        }}>BETA</span>
      </div>

      {/* Main nav */}
      <nav style={{ padding: '4px 0', flex: 1 }}>
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
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: 'calc(100% - 16px)',
            padding: '8px 12px', margin: '1px 8px', borderRadius: 8,
            fontSize: 14, color: 'var(--ml-muted)', background: 'transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in oklch, var(--ml-ink) 6%, transparent)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--ml-faint)', display: 'flex' }}>{ICON.integrations}</span>
            Integrações
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: intOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {isAdmin && (
          <>
            <div style={{ padding: '12px 8px 4px', marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ml-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px' }}>
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
