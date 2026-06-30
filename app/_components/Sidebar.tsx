'use client';

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
  { label: 'Explorar', href: '/explore', icon: 'explore' },
  { label: 'Grupos', href: '/groups', icon: 'groups' },
  { label: 'Integrações', href: '/integrations', icon: 'integrations' },
];

const NAV_BETA = [
  { label: 'Planos', href: '/planos', icon: 'plans' },
  { label: 'Roadmap', href: '/roadmap', icon: 'roadmap' },
  { label: 'Suporte', href: '/support', icon: 'support' },
];

export function Sidebar({ active }: { active?: string }) {
  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#0f0f0f',
      borderRight: '1px solid #1f2937',
      padding: '0',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 20px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #1a1a1a' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', color: '#fff' }}>MUSILISTA</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, border: '1px solid rgba(132,204,22,0.4)', color: '#84cc16' }}>BETA</span>
      </div>

      {/* Main nav */}
      <nav style={{ padding: '8px 0', flex: 1 }}>
        {NAV_MAIN.map((item) => {
          const isActive = active === item.href || (active?.startsWith('/groups') && item.href === '/groups');
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#e5e7eb' : '#6b7280',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderLeft: isActive ? '2px solid #84cc16' : '2px solid transparent',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ color: isActive ? '#84cc16' : '#4b5563', display: 'flex', flexShrink: 0 }}>
                {ICON[item.icon]}
              </span>
              {item.label}
            </a>
          );
        })}

        <div style={{ padding: '16px 16px 6px', fontSize: 10, fontWeight: 700, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Beta Test
        </div>

        {NAV_BETA.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              fontSize: 14,
              color: '#6b7280',
              textDecoration: 'none',
              borderLeft: '2px solid transparent',
            }}
          >
            <span style={{ color: '#4b5563', display: 'flex', flexShrink: 0 }}>{ICON[item.icon]}</span>
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
