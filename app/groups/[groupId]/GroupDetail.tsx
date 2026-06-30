'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Role = { id: string; roleName: string; userId: string | null; userName: string | null };
type RepertoryLink = { repertoireId: string; name: string | null };
type Event = {
  id: string;
  title: string;
  eventDate: string;
  eventTime: string | null;
  eventType: string;
  notice: string | null;
  location: string | null;
  publicToken: string | null;
  roles: Role[];
  acknowledgedCount: number;
  userAcknowledged: boolean;
  repertoireLinks: RepertoryLink[];
};
type Group = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  image: string | null;
  myRole: string;
  memberCount: number;
};

const TYPE_LABEL: Record<string, string> = { show: 'Show', ensaio: 'Ensaio', other: 'Outro' };
const TYPE_COLOR: Record<string, string> = {
  show: '#be185d',
  ensaio: '#1d4ed8',
  other: '#374151',
};

function formatDate(dateStr: string, timeStr: string | null) {
  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  return timeStr ? `${dateLabel} às ${timeStr.slice(0, 5)}` : dateLabel;
}

function ShareButton({ event, groupId }: { event: Event; groupId: string }) {
  const [pending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(event.publicToken);
  const router = useRouter();

  const APP_URL = 'https://musilista.vercel.app';

  function handleShare() {
    if (token) {
      navigator.clipboard?.writeText(`${APP_URL}/agenda/${token}`).catch(() => {});
      window.open(`${APP_URL}/agenda/${token}`, '_blank');
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/events/${event.id}/share`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const newToken = data.url.split('/agenda/')[1];
        setToken(newToken);
        navigator.clipboard?.writeText(data.url).catch(() => {});
        window.open(data.url, '_blank');
        router.refresh();
      }
    });
  }

  function handleRevoke() {
    if (!confirm('Revogar o link? Ele deixará de funcionar.')) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/events/${event.id}/share`, { method: 'DELETE' });
      if (res.ok) {
        setToken(null);
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      <button
        onClick={handleShare}
        disabled={pending}
        style={{
          padding: '6px 14px',
          borderRadius: 8,
          border: token ? '1px solid #84cc16' : '1px solid #374151',
          background: token ? 'rgba(132,204,22,0.1)' : 'transparent',
          color: token ? '#84cc16' : '#9ca3af',
          fontSize: 13,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: pending ? 'wait' : 'pointer',
        }}
      >
        {pending ? '...' : token ? '🔗 Copiar link público' : '🔗 Compartilhar agenda'}
      </button>
      {token && (
        <button
          onClick={handleRevoke}
          disabled={pending}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid #374151',
            background: 'transparent',
            color: '#6b7280',
            fontSize: 12,
            cursor: pending ? 'wait' : 'pointer',
          }}
        >
          Revogar
        </button>
      )}
    </div>
  );
}

function AttendanceButton({ event, groupId }: { event: Event; groupId: string }) {
  const [confirmed, setConfirmed] = useState(event.userAcknowledged);
  const [count, setCount] = useState(event.acknowledgedCount);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    if (confirmed) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/events/${event.id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        setConfirmed(true);
        setCount((c) => c + 1);
      }
    });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #1f2937' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{count} de {event.acknowledgedCount + (event.userAcknowledged ? 0 : 0)} confirmaram</span>
      <button
        onClick={handleConfirm}
        disabled={confirmed || pending}
        style={{
          padding: '7px 18px',
          borderRadius: 8,
          border: 'none',
          background: confirmed ? '#16a34a' : '#1f2937',
          color: confirmed ? '#fff' : '#9ca3af',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {confirmed ? '✓ Confirmado' : 'Confirmar'}
      </button>
    </div>
  );
}

function EventCard({ event, groupId, canManage }: { event: Event; groupId: string; canManage: boolean }) {
  const typeColor = TYPE_COLOR[event.eventType] ?? '#374151';

  return (
    <div style={{
      background: '#111111',
      border: '1px solid #1f2937',
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            padding: '3px 10px',
            borderRadius: 20,
            background: typeColor,
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {TYPE_LABEL[event.eventType] ?? event.eventType}
          </span>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(event.eventDate, event.eventTime)}</span>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 16 }}>
            <a href={`/groups/${groupId}/events/${event.id}/edit`} style={{ fontSize: 13, color: '#9ca3af' }}>Editar</a>
            <button
              onClick={async () => {
                if (!confirm('Excluir este evento?')) return;
                await fetch(`/api/groups/${groupId}/events/${event.id}`, { method: 'DELETE' });
                window.location.reload();
              }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: '#9ca3af', padding: 0 }}
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#fff' }}>{event.title}</h3>

      {event.location && (
        <p style={{ margin: '0 0 10px', fontSize: 14, color: '#6b7280' }}>📍 {event.location}</p>
      )}

      {event.notice && (
        <div style={{ background: '#451a03', border: '1px solid #78350f', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fbbf24' }}>
          ⚠️ {event.notice}
        </div>
      )}

      {event.repertoireLinks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Repertórios</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {event.repertoireLinks.map((r) => (
              <span key={r.repertoireId} style={{
                padding: '3px 10px',
                borderRadius: 20,
                background: '#1f2937',
                fontSize: 13,
                color: '#d1d5db',
                border: '1px solid #374151',
              }}>
                {r.name ?? 'Repertório'}
              </span>
            ))}
          </div>
        </div>
      )}

      {event.roles.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Funções</p>
          {event.roles.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ minWidth: 100, fontSize: 13, color: '#d1d5db' }}>{r.roleName}</span>
              <span style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: 8,
                background: '#1f2937',
                border: '1px solid #374151',
                fontSize: 13,
                color: r.userName ? '#e5e7eb' : '#6b7280',
              }}>
                {r.userName ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {canManage && <ShareButton event={event} groupId={groupId} />}

      <AttendanceButton event={event} groupId={groupId} />
    </div>
  );
}

export function GroupDetail({
  group,
  events,
  userName,
}: {
  group: Group;
  events: Event[];
  userName: string;
}) {
  const [tab, setTab] = useState<'repertorio' | 'agenda'>('agenda');
  const canManage = group.myRole !== 'MEMBRO';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        minHeight: '100vh',
        background: '#0f0f0f',
        borderRight: '1px solid #1f2937',
        padding: '16px 0',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '12px 20px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#84cc16', fontSize: 20 }}>♪</span>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: '#fff' }}>MUSILISTA</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(132,204,22,0.2)', color: '#84cc16' }}>BETA</span>
        </div>
        <nav>
          {[
            { label: 'Início', href: '/' },
            { label: 'Explorar', href: '/explore' },
            { label: 'Grupos', href: '/groups', active: true },
            { label: 'Integrações', href: '/integrations' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '9px 20px',
                fontSize: 14,
                color: item.active ? '#e5e7eb' : '#6b7280',
                background: item.active ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: item.active ? '2px solid #84cc16' : '2px solid transparent',
              }}
            >
              {item.label}
            </a>
          ))}
          <div style={{ padding: '16px 20px 8px', fontSize: 11, fontWeight: 600, color: '#374151', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Beta Test</div>
          {[
            { label: 'Planos', href: '/planos' },
            { label: 'Roadmap', href: '/roadmap' },
            { label: 'Suporte', href: '/support' },
          ].map((item) => (
            <a key={item.href} href={item.href} style={{ display: 'block', padding: '9px 20px', fontSize: 14, color: '#6b7280' }}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '12px 32px',
          borderBottom: '1px solid #1f2937',
          gap: 16,
        }}>
          <span style={{ fontSize: 14, color: '#9ca3af' }}>{userName}</span>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#84cc16', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: '#000',
          }}>
            {userName?.[0]?.toUpperCase()}
          </div>
        </header>

        <main style={{ padding: '32px', flex: 1 }}>
          {/* Group header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/groups" style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 12 }}>← Grupos</a>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff' }}>{group.name}</h1>
              {group.description && (
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>{group.description}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Código de convite</p>
              <button
                onClick={() => navigator.clipboard?.writeText(group.inviteCode)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, fontWeight: 700, color: '#84cc16', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {group.inviteCode}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1f2937', marginBottom: 28, gap: 4 }}>
            {[
              { key: 'repertorio', label: 'Repertório' },
              { key: 'agenda', label: 'Agenda' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as 'repertorio' | 'agenda')}
                style={{
                  padding: '10px 20px',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid #84cc16' : '2px solid transparent',
                  color: tab === t.key ? '#fff' : '#6b7280',
                  fontSize: 14,
                  fontWeight: tab === t.key ? 600 : 400,
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'repertorio' && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
              <p>Acesse o repertório pelo site completo</p>
              <a href={`/groups/${group.id}`} style={{ color: '#84cc16', fontSize: 14 }}>
                Abrir versão completa →
              </a>
            </div>
          )}

          {tab === 'agenda' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Agenda</h2>
                {canManage && (
                  <a
                    href={`/groups/${group.id}/events/new`}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      background: '#84cc16',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    + Evento
                  </a>
                )}
              </div>

              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
                  <p style={{ fontSize: 24, marginBottom: 8 }}>📅</p>
                  <p>Nenhum evento agendado</p>
                </div>
              ) : (
                events.map((ev) => (
                  <EventCard key={ev.id} event={ev} groupId={group.id} canManage={canManage} />
                ))
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
