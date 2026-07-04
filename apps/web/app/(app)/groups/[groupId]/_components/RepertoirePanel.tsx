'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import { IconClose, IconCheck } from '@/components/ui/icons';

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
type SongResult = { id: string; title: string; artist: string };

function parseArtist(notes: string | null): string {
  if (!notes) return '';
  const m = notes.match(/^artist:([^|]+)/);
  return m ? m[1].trim() : '';
}

export function RepertoirePanel({ groupId, canManage }: { groupId: string; canManage: boolean }) {
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

  if (loading) return <div className="py-10 text-center text-muted">Carregando...</div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Repertórios</h2>
        {canManage && (
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>
            + Novo Repertório
          </Button>
        )}
      </div>

      {/* Create form */}
      {showNew && (
        <form onSubmit={handleCreateRepertoire} className="mb-5 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do repertório (ex: Setlist Verão 2026)"
            required
            autoFocus
            className="flex-1"
            aria-label="Nome do repertório"
          />
          <Button type="submit" disabled={pending}>Criar</Button>
          <Button variant="outline" type="button" onClick={() => setShowNew(false)}><IconClose size={13} /></Button>
        </form>
      )}

      {repertoires.length === 0 ? (
        <div className="py-14 text-center text-faint">
          <p className="mb-1 text-muted">Nenhum repertório ainda</p>
          {canManage && <p className="text-[13px]">Clique em &quot;+ Novo Repertório&quot; para começar</p>}
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Repertoire list (sidebar) */}
          <div className="w-[200px] shrink-0">
            {repertoires.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={cn(
                  'mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                  activeId === r.id
                    ? 'border-[color-mix(in_oklch,var(--ml-accent)_30%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_12%,transparent)]'
                    : 'border-transparent hover:bg-surface',
                )}
              >
                <div className={cn('mb-0.5 text-[13px] font-semibold', activeId === r.id ? 'text-accent' : 'text-muted')}>
                  {r.name}
                </div>
                <div className="text-[11px] text-faint">{r.songs.length} músicas</div>
              </button>
            ))}
          </div>

          {/* Active repertoire detail */}
          {active && (
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[15px] font-bold text-ink">{active.name}</span>
                {canManage && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setShowAddSong(true)}>+ Adicionar música</Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteRepertoire(active.id)}>
                      Excluir
                    </Button>
                  </div>
                )}
              </div>

              {/* Song list */}
              {active.songs.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-faint">
                  Nenhuma música. Clique em &quot;+ Adicionar música&quot; para buscar no acervo.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {active.songs.map((s, i) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3.5 py-2.5"
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-faint">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-ink">{s.title}</div>
                        {parseArtist(s.notes) && (
                          <div className="text-xs text-muted">{parseArtist(s.notes)}</div>
                        )}
                      </div>
                      {s.songKey && (
                        <span className="shrink-0 rounded-md bg-blue-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-400">
                          {s.songKey}
                        </span>
                      )}
                      {s.bpm && <span className="shrink-0 font-mono text-[11px] text-faint">{s.bpm} bpm</span>}
                      {canManage && (
                        <button
                          onClick={() => handleRemoveSong(active.id, s.id)}
                          className="shrink-0 flex items-center px-1 text-faint transition-colors hover:text-red-400"
                          aria-label={`Remover ${s.title}`}
                        >
                          <IconClose size={12} />
                        </button>
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
        <Modal onClose={() => setShowAddSong(false)} title="Adicionar música ao repertório" className="max-w-lg p-7">
          {/* Search */}
          <div className="relative mb-3">
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por título ou artista..."
              autoFocus
              aria-label="Buscar música"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Buscando...</span>
            )}
          </div>

          {/* Results */}
          {results.length > 0 && !selected && (
            <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-line">
              {results.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setQuery(`${s.title} — ${s.artist}`); setResults([]); }}
                  className="block w-full border-b border-line px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface"
                >
                  <span className="text-sm font-semibold text-ink">{s.title}</span>
                  <span className="ml-2 text-xs text-muted">{s.artist}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <form onSubmit={handleAddSong} className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 rounded-lg border border-[color-mix(in_oklch,var(--ml-accent)_20%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_8%,transparent)] px-3 py-2 text-[13px] text-accent">
                <IconCheck size={13} /> {selected.title} — {selected.artist}
                <button
                  type="button"
                  onClick={() => { setSelected(null); setQuery(''); }}
                  className="ml-2 flex items-center text-muted transition-colors hover:text-ink"
                  aria-label="Remover seleção"
                >
                  <IconClose size={12} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <Input
                  label="Tom (opcional)"
                  value={songKey}
                  onChange={(e) => setSongKey(e.target.value)}
                  placeholder="Ex: Am, G, C#m"
                />
                <Input
                  label="BPM (opcional)"
                  value={bpm}
                  onChange={(e) => setBpm(e.target.value)}
                  type="number"
                  placeholder="Ex: 120"
                />
              </div>
              <div className="mt-1 flex justify-end gap-2.5">
                <Button variant="outline" type="button" onClick={() => setShowAddSong(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>Adicionar</Button>
              </div>
            </form>
          )}

          {!selected && query.length > 1 && !searching && results.length === 0 && (
            <p className="mt-2 text-[13px] text-faint">Nenhuma música encontrada para &quot;{query}&quot;</p>
          )}
        </Modal>
      )}
    </div>
  );
}
