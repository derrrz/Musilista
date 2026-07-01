'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/app/_components/Sidebar';
import { TopBar } from '@/app/_components/TopBar';

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

// ─── Repertório types ────────────────────────────────────────────────
type RepertoireSong = {
  id: string;
  title: string | null;
  notes: string | null;
  songKey: string | null;
  bpm: number | null;
  position: number;
};
type Repertoire = {
  id: string;
  name: string;
  createdAt: string;
  songs: RepertoireSong[];
};

// ─── Song search result from /api/directory ───────────────────────────
type SongResult = { id: string; title: string; artist: string };

function parseArtist(notes: string | null): string {
  if (!notes) return '';
  const m = notes.match(/^artist:([^|]+)/);
  return m ? m[1].trim() : '';
}

function RepertoirePanel({ groupId, canManage }: { groupId: string; canManage: boolean }) {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [pending, startTransition] = useTransition();

  // song-add state
  const [showAddSong, setShowAddSong] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SongResult | null>(null);
  const [songKey, setSongKey] = useState('');
  const [bpm, setBpm] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/groups/${groupId}/repertoires`);
    if (res.ok) {
      const data = await res.json();
      setRepertoires(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    }
    setLoading(false);
  }, [groupId, activeId]);

  useEffect(() => { load(); }, []);

  function handleSearch(q: string) {
    setQuery(q);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/directory?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.songs ?? []);
      }
      setSearching(false);
    }, 350);
  }

  function handleCreateRepertoire(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/repertoires`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        const r = await res.json();
        setRepertoires((prev) => [...prev, r]);
        setActiveId(r.id);
        setNewName('');
        setShowNew(false);
      }
    });
  }

  function handleDeleteRepertoire(id: string) {
    if (!confirm('Remover este repertório?')) return;
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/repertoires/${id}`, { method: 'DELETE' });
      setRepertoires((prev) => prev.filter((r) => r.id !== id));
      if (activeId === id) setActiveId(repertoires.find((r) => r.id !== id)?.id ?? null);
    });
  }

  function handleAddSong(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !activeId) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/repertoires/${activeId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: selected.title, artist: selected.artist, songKey, bpm }),
      });
      if (res.ok) {
        const song = await res.json();
        setRepertoires((prev) =>
          prev.map((r) => r.id === activeId ? { ...r, songs: [...r.songs, song] } : r),
        );
        setShowAddSong(false);
        setSelected(null);
        setQuery('');
        setResults([]);
        setSongKey('');
        setBpm('');
      }
    });
  }

  function handleRemoveSong(repertoireId: string, songItemId: string) {
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/repertoires/${repertoireId}/songs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songItemId }),
      });
      setRepertoires((prev) =>
        prev.map((r) => r.id === repertoireId ? { ...r, songs: r.songs.filter((s) => s.id !== songItemId) } : r),
      );
    });
  }

  const active = repertoires.find((r) => r.id === activeId);

  const INPUT: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--ml-line)', background: 'var(--ml-line)',
    color: 'var(--ml-ink)', fontSize: 14, boxSizing: 'border-box',
  };

  if (loading) return <div style={{ padding: '40px 0', color: 'var(--ml-muted)', textAlign: 'center' }}>Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ml-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Repertórios</h2>
        {canManage && (
          <button onClick={() => setShowNew((v) => !v)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            + Novo Repertório
          </button>
        )}
      </div>

      {/* Create form */}
      {showNew && (
        <form onSubmit={handleCreateRepertoire} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do repertório (ex: Setlist Verão 2026)"
            required
            autoFocus
            style={{ ...INPUT, flex: 1 }}
          />
          <button type="submit" disabled={pending} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>Criar</button>
          <button type="button" onClick={() => setShowNew(false)} style={{
            padding: '9px 14px', borderRadius: 8, border: '1px solid var(--ml-line)',
            background: 'transparent', color: 'var(--ml-muted)', fontSize: 13, cursor: 'pointer',
          }}>✕</button>
        </form>
      )}

      {repertoires.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ml-faint)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🎵</p>
          <p style={{ marginBottom: 4, color: 'var(--ml-muted)' }}>Nenhum repertório ainda</p>
          {canManage && <p style={{ fontSize: 13 }}>Clique em &quot;+ Novo Repertório&quot; para começar</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Repertoire list (sidebar) */}
          <div style={{ width: 200, flexShrink: 0 }}>
            {repertoires.map((r) => (
              <div
                key={r.id}
                onClick={() => setActiveId(r.id)}
                style={{
                  padding: '10px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                  background: activeId === r.id ? 'color-mix(in oklch, var(--ml-accent) 12%, transparent)' : 'transparent',
                  border: activeId === r.id ? '1px solid color-mix(in oklch, var(--ml-accent) 30%, transparent)' : '1px solid transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: activeId === r.id ? 'var(--ml-accent)' : 'var(--ml-muted)', marginBottom: 2 }}>
                  {r.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ml-faint)' }}>{r.songs.length} músicas</div>
              </div>
            ))}
          </div>

          {/* Active repertoire detail */}
          {active && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ml-ink)' }}>{active.name}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {canManage && (
                    <button onClick={() => setShowAddSong(true)} style={{
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>+ Adicionar música</button>
                  )}
                  {canManage && (
                    <button onClick={() => handleDeleteRepertoire(active.id)} style={{
                      padding: '7px 12px', borderRadius: 8, border: '1px solid var(--ml-line)',
                      background: 'transparent', color: 'var(--ml-muted)', fontSize: 12, cursor: 'pointer',
                    }}>Excluir</button>
                  )}
                </div>
              </div>

              {/* Song list */}
              {active.songs.length === 0 ? (
                <div style={{ padding: '32px 0', color: 'var(--ml-faint)', textAlign: 'center', fontSize: 13 }}>
                  Nenhuma música. Clique em &quot;+ Adicionar música&quot; para buscar no acervo.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {active.songs.map((s, i) => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 8,
                      background: 'var(--ml-raised)', border: '1px solid var(--ml-line)',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--ml-faint)', width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ml-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.title}
                        </div>
                        {parseArtist(s.notes) && (
                          <div style={{ fontSize: 12, color: 'var(--ml-muted)' }}>{parseArtist(s.notes)}</div>
                        )}
                      </div>
                      {s.songKey && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(59,130,246,0.15)', color: '#60a5fa', flexShrink: 0,
                        }}>{s.songKey}</span>
                      )}
                      {s.bpm && (
                        <span style={{ fontSize: 11, color: 'var(--ml-faint)', flexShrink: 0 }}>{s.bpm} bpm</span>
                      )}
                      {canManage && (
                        <button onClick={() => handleRemoveSong(active.id, s.id)} style={{
                          background: 'transparent', border: 'none', color: 'var(--ml-line)',
                          cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px', flexShrink: 0,
                        }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Song Modal */}
      {showAddSong && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }} onClick={() => setShowAddSong(false)}>
          <div style={{
            background: 'var(--ml-raised)', border: '1px solid var(--ml-line)', borderRadius: 16,
            padding: 28, width: '100%', maxWidth: 480,
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--ml-ink)' }}>Adicionar música ao repertório</h3>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por título ou artista..."
                autoFocus
                style={{ ...INPUT }}
              />
              {searching && (
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--ml-muted)' }}>
                  Buscando...
                </span>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && !selected && (
              <div style={{
                border: '1px solid var(--ml-line)', borderRadius: 8, overflow: 'hidden', marginBottom: 12, maxHeight: 220, overflowY: 'auto',
              }}>
                {results.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelected(s); setQuery(`${s.title} — ${s.artist}`); setResults([]); }}
                    style={{
                      display: 'block', width: '100%', padding: '10px 14px', textAlign: 'left',
                      background: 'transparent', border: 'none', borderBottom: '1px solid var(--ml-line)',
                      cursor: 'pointer', color: 'var(--ml-ink)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in oklch, var(--ml-ink) 5%, transparent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--ml-muted)', marginLeft: 8 }}>{s.artist}</span>
                  </button>
                ))}
              </div>
            )}

            {selected && (
              <form onSubmit={handleAddSong} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'color-mix(in oklch, var(--ml-accent) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--ml-accent) 20%, transparent)', fontSize: 13, color: 'var(--ml-accent)' }}>
                  ✓ {selected.title} — {selected.artist}
                  <button type="button" onClick={() => { setSelected(null); setQuery(''); }} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--ml-muted)', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ml-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tom (opcional)</label>
                    <input value={songKey} onChange={(e) => setSongKey(e.target.value)} placeholder="Ex: Am, G, C#m" style={INPUT} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ml-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>BPM (opcional)</label>
                    <input value={bpm} onChange={(e) => setBpm(e.target.value)} type="number" placeholder="Ex: 120" style={INPUT} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button type="button" onClick={() => setShowAddSong(false)} style={{
                    padding: '9px 16px', borderRadius: 8, border: '1px solid var(--ml-line)',
                    background: 'transparent', color: 'var(--ml-muted)', fontSize: 13, cursor: 'pointer',
                  }}>Cancelar</button>
                  <button type="submit" disabled={pending} style={{
                    padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>Adicionar</button>
                </div>
              </form>
            )}

            {!selected && query.length > 1 && !searching && results.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--ml-faint)', margin: '8px 0 0' }}>Nenhuma música encontrada para &quot;{query}&quot;</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Existing constants ───────────────────────────────────────────────
const TYPE_LABEL: Record<string, string> = { show: 'Show', ensaio: 'Ensaio', other: 'Outro' };
const TYPE_COLOR: Record<string, string> = {
  show: '#be185d',
  ensaio: '#1d4ed8',
  other: 'var(--ml-line)',
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
          border: token ? '1px solid var(--ml-accent)' : '1px solid var(--ml-line)',
          background: token ? 'color-mix(in oklch, var(--ml-accent) 10%, transparent)' : 'transparent',
          color: token ? 'var(--ml-accent)' : 'var(--ml-muted)',
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
            border: '1px solid var(--ml-line)',
            background: 'transparent',
            color: 'var(--ml-muted)',
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--ml-line)' }}>
      <span style={{ fontSize: 13, color: 'var(--ml-muted)' }}>{count} de {event.acknowledgedCount + (event.userAcknowledged ? 0 : 0)} confirmaram</span>
      <button
        onClick={handleConfirm}
        disabled={confirmed || pending}
        style={{
          padding: '7px 18px',
          borderRadius: 8,
          border: 'none',
          background: confirmed ? '#16a34a' : 'var(--ml-line)',
          color: confirmed ? 'var(--ml-ink)' : 'var(--ml-muted)',
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
  const typeColor = TYPE_COLOR[event.eventType] ?? 'var(--ml-line)';

  return (
    <div style={{
      background: 'var(--ml-raised)',
      border: '1px solid var(--ml-line)',
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
            color: 'var(--ml-ink)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            {TYPE_LABEL[event.eventType] ?? event.eventType}
          </span>
          <span style={{ fontSize: 13, color: 'var(--ml-muted)' }}>{formatDate(event.eventDate, event.eventTime)}</span>
        </div>
        {canManage && (
          <div style={{ display: 'flex', gap: 16 }}>
            <a href={`/groups/${groupId}/events/${event.id}/edit`} style={{ fontSize: 13, color: 'var(--ml-muted)' }}>Editar</a>
            <button
              onClick={async () => {
                if (!confirm('Excluir este evento?')) return;
                await fetch(`/api/groups/${groupId}/events/${event.id}`, { method: 'DELETE' });
                window.location.reload();
              }}
              style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ml-muted)', padding: 0 }}
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      <h3 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: 'var(--ml-ink)' }}>{event.title}</h3>

      {event.location && (
        <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ml-muted)' }}>📍 {event.location}</p>
      )}

      {event.notice && (
        <div style={{ background: '#451a03', border: '1px solid #78350f', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: '#fbbf24' }}>
          ⚠️ {event.notice}
        </div>
      )}

      {event.repertoireLinks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--ml-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Repertórios</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {event.repertoireLinks.map((r) => (
              <span key={r.repertoireId} style={{
                padding: '3px 10px',
                borderRadius: 20,
                background: 'var(--ml-line)',
                fontSize: 13,
                color: 'var(--ml-ink)',
                border: '1px solid var(--ml-line)',
              }}>
                {r.name ?? 'Repertório'}
              </span>
            ))}
          </div>
        </div>
      )}

      {event.roles.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--ml-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Funções</p>
          {event.roles.map((r) => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ minWidth: 100, fontSize: 13, color: 'var(--ml-ink)' }}>{r.roleName}</span>
              <span style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: 8,
                background: 'var(--ml-line)',
                border: '1px solid var(--ml-line)',
                fontSize: 13,
                color: r.userName ? 'var(--ml-ink)' : 'var(--ml-muted)',
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
  userImage,
  isAdmin,
}: {
  group: Group;
  events: Event[];
  userName: string;
  userImage?: string | null;
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<'repertorio' | 'agenda'>('agenda');
  const canManage = group.myRole !== 'MEMBRO';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--ml-bg)' }}>
      <Sidebar active="/groups" isAdmin={isAdmin} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar userName={userName} userImage={userImage} />

        <main style={{ padding: '32px', flex: 1 }}>
          {/* Group header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/groups" style={{ fontSize: 13, color: 'var(--ml-muted)', display: 'block', marginBottom: 12 }}>← Grupos</a>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'var(--ml-ink)' }}>{group.name}</h1>
              {group.description && (
                <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ml-muted)' }}>{group.description}</p>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--ml-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Código de convite</p>
              <button
                onClick={() => navigator.clipboard?.writeText(group.inviteCode)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 15, fontWeight: 700, color: 'var(--ml-accent)', cursor: 'pointer', fontFamily: 'monospace' }}
              >
                {group.inviteCode}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--ml-line)', marginBottom: 28, gap: 4 }}>
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
                  borderBottom: tab === t.key ? '2px solid var(--ml-accent)' : '2px solid transparent',
                  color: tab === t.key ? 'var(--ml-ink)' : 'var(--ml-muted)',
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
            <RepertoirePanel groupId={group.id} canManage={canManage} />
          )}

          {tab === 'agenda' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ml-muted)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Agenda</h2>
                {canManage && (
                  <a
                    href={`/groups/${group.id}/events/new`}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      background: 'var(--ml-accent)',
                      color: 'var(--ml-accent-ink)',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    + Evento
                  </a>
                )}
              </div>

              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ml-muted)' }}>
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
