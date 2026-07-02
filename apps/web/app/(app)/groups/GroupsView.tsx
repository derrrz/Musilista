'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Group = {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  image: string | null;
  role: string;
  memberCount: number;
};

const ROLE_LABEL: Record<string, string> = { owner: 'Dono', admin: 'Admin', member: 'Membro' };
const ROLE_COLOR: Record<string, string> = {
  owner: 'var(--ml-accent)',
  admin: '#3b82f6',
  member: 'var(--ml-muted)',
};

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Erro ao criar grupo');
        return;
      }
      const group = await res.json();
      onCreated(group.id);
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--ml-raised)', border: '1px solid var(--ml-line)', borderRadius: 16,
        padding: 32, width: '100%', maxWidth: 420,
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 700, color: 'var(--ml-ink)' }}>Novo Grupo</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ml-muted)', marginBottom: 6 }}>Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Banda do Samba"
              required
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--ml-line)',
                background: 'var(--ml-line)', color: 'var(--ml-ink)', fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ml-muted)', marginBottom: 6 }}>Descrição <span style={{ fontWeight: 400, color: 'var(--ml-faint)' }}>(opcional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do grupo"
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--ml-line)',
                background: 'var(--ml-line)', color: 'var(--ml-ink)', fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
              }}
            />
          </div>
          {error && <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid var(--ml-line)',
              background: 'transparent', color: 'var(--ml-muted)', fontSize: 14, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={pending} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 14, fontWeight: 700, cursor: pending ? 'wait' : 'pointer',
            }}>{pending ? 'Criando...' : 'Criar Grupo'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: (id: string) => void }) {
  const [code, setCode] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Erro ao entrar no grupo'); return; }
      onJoined(d.id);
    });
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--ml-raised)', border: '1px solid var(--ml-line)', borderRadius: 16,
        padding: 32, width: '100%', maxWidth: 380,
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--ml-ink)' }}>Entrar com código</h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ml-muted)' }}>Peça o código ao dono do grupo</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="GRP-XXXXXX"
            required
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--ml-line)',
              background: 'var(--ml-line)', color: 'var(--ml-ink)', fontSize: 18, fontFamily: 'monospace',
              letterSpacing: '0.1em', textAlign: 'center', boxSizing: 'border-box',
            }}
          />
          {error && <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 8, border: '1px solid var(--ml-line)',
              background: 'transparent', color: 'var(--ml-muted)', fontSize: 14, cursor: 'pointer',
            }}>Cancelar</button>
            <button type="submit" disabled={pending} style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 14, fontWeight: 700, cursor: pending ? 'wait' : 'pointer',
            }}>{pending ? 'Entrando...' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function GroupsView({ groups }: { groups: Group[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const router = useRouter();

  function handleCreated(id: string) {
    setShowCreate(false);
    router.push(`/groups/${id}`);
  }

  function handleJoined(id: string) {
    setShowJoin(false);
    router.push(`/groups/${id}`);
  }

  return (
    <>
      <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--ml-ink)' }}>Meus Grupos</h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowJoin(true)} style={{
                padding: '9px 18px', borderRadius: 8, border: '1px solid var(--ml-line)',
                background: 'transparent', color: 'var(--ml-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Entrar com código
              </button>
              <button onClick={() => setShowCreate(true)} style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                + Novo Grupo
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ml-muted)' }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>🎵</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--ml-muted)', marginBottom: 8 }}>Nenhum grupo ainda</p>
              <p style={{ fontSize: 14, marginBottom: 24 }}>Crie um grupo ou entre com um código de convite</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => setShowJoin(true)} style={{
                  padding: '10px 20px', borderRadius: 8, border: '1px solid var(--ml-line)',
                  background: 'transparent', color: 'var(--ml-muted)', fontSize: 14, cursor: 'pointer',
                }}>
                  Entrar com código
                </button>
                <button onClick={() => setShowCreate(true)} style={{
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                  Criar Grupo
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {groups.map((g) => (
                <a key={g.id} href={`/groups/${g.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--ml-raised)', border: '1px solid var(--ml-line)', borderRadius: 12,
                    padding: 20, cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ml-line)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--ml-line)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, background: 'var(--ml-line)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {g.image ? (
                          <img src={g.image} alt="" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
                        ) : '🎵'}
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: `${ROLE_COLOR[g.role]}20`,
                        color: ROLE_COLOR[g.role],
                      }}>
                        {ROLE_LABEL[g.role] ?? g.role}
                      </span>
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--ml-ink)' }}>{g.name}</h3>
                    {g.description && (
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ml-muted)', lineHeight: 1.4 }}>
                        {g.description.length > 80 ? g.description.slice(0, 80) + '...' : g.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: g.description ? 0 : 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--ml-faint)' }}>
                        {g.memberCount} {g.memberCount === 1 ? 'membro' : 'membros'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--ml-line)' }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--ml-line)', fontFamily: 'monospace' }}>{g.inviteCode}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />}
    </>
  );
}
