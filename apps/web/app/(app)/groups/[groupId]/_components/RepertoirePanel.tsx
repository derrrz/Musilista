'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import {
  IconClose, IconCheck, IconEdit, IconChevronUp, IconChevronDown,
  IconGuitar, IconMic, IconScreen, IconGroups, IconPlay, IconHeart,
  IconDocument, IconPause, IconSettings, IconMenu,
} from '@/components/ui/icons';
import { BLOCK_TYPES, blockDef, formatDuration, type BlockType } from '@/app/_lib/setlistBlocks';
import type { IconProps } from '@/components/ui/icons';

type SetlistBlock = {
  id: string;
  title: string | null;
  notes: string | null;
  songKey: string | null;
  bpm: number | null;
  position: number;
  itemType: string | null;
  body: string | null;
  durationSec: number | null;
  segue: boolean | null;
};
type Repertoire = {
  id: string;
  name: string;
  createdAt: string;
  songs: SetlistBlock[];
};
type SongResult = { id: string; title: string; artist: string };

const BLOCK_ICON: Record<BlockType, (props: IconProps) => React.ReactNode> = {
  song: IconGuitar,
  section: IconMenu,
  talk: IconMic,
  interaction: IconGroups,
  improv: IconPlay,
  prayer: IconHeart,
  reading: IconDocument,
  media: IconScreen,
  break: IconPause,
  technical: IconSettings,
};

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
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [pending, startTransition] = useTransition();

  // adicionar/editar bloco
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<{ type: BlockType; editingId?: string } | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockBody, setBlockBody] = useState('');
  const [blockMinutes, setBlockMinutes] = useState('');

  // busca de música no acervo
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

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameValue.trim() || !activeId) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/repertoires/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        const r = await res.json();
        setRepertoires((prev) => prev.map((x) => (x.id === activeId ? { ...x, name: r.name } : x)));
        setRenaming(false);
      }
    });
  }

  function handleDeleteRepertoire(id: string) {
    if (!confirm('Remover este setlist?')) return;
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/repertoires/${id}`, { method: 'DELETE' });
      setRepertoires((prev) => prev.filter((r) => r.id !== id));
      if (activeId === id) setActiveId(repertoires.find((r) => r.id !== id)?.id ?? null);
    });
  }

  function openBlockForm(type: BlockType, block?: SetlistBlock) {
    setBlockMenuOpen(false);
    setBlockForm({ type, editingId: block?.id });
    setBlockTitle(block?.title ?? (type === 'section' ? '' : blockDef(type).label));
    setBlockBody(block?.body ?? '');
    setBlockMinutes(block?.durationSec ? String(Math.round(block.durationSec / 60)) : '');
    if (type === 'song' && block) {
      setSongKey(block.songKey ?? '');
      setBpm(block.bpm ? String(block.bpm) : '');
    }
  }

  function closeBlockForm() {
    setBlockForm(null);
    setBlockTitle('');
    setBlockBody('');
    setBlockMinutes('');
    setSelected(null);
    setQuery('');
    setResults([]);
    setSongKey('');
    setBpm('');
  }

  function submitBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !blockForm) return;
    const isSong = blockForm.type === 'song';
    if (isSong && !blockForm.editingId && !selected) return;
    if (!isSong && !blockTitle.trim()) return;

    startTransition(async () => {
      const durationSec = blockMinutes ? Math.round(Number(blockMinutes) * 60) : null;
      const url = `/api/groups/${groupId}/repertoires/${activeId}/songs`;
      let res: Response;
      if (blockForm.editingId) {
        res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songItemId: blockForm.editingId,
            title: isSong ? undefined : blockTitle,
            body: isSong ? undefined : blockBody,
            durationSec,
            ...(isSong ? { songKey, bpm } : {}),
          }),
        });
      } else {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            isSong
              ? { itemType: 'song', title: selected!.title, artist: selected!.artist, songKey, bpm, durationSec }
              : { itemType: blockForm.type, title: blockTitle, body: blockBody, durationSec },
          ),
        });
      }
      if (res.ok) {
        const entry = await res.json();
        setRepertoires((prev) =>
          prev.map((r) => {
            if (r.id !== activeId) return r;
            const songs = blockForm.editingId
              ? r.songs.map((s) => (s.id === entry.id ? entry : s))
              : [...r.songs, entry];
            return { ...r, songs };
          }),
        );
        closeBlockForm();
      }
    });
  }

  function handleRemoveBlock(repertoireId: string, songItemId: string) {
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

  function moveBlock(repertoireId: string, index: number, dir: -1 | 1) {
    const rep = repertoires.find((r) => r.id === repertoireId);
    if (!rep) return;
    const target = index + dir;
    if (target < 0 || target >= rep.songs.length) return;
    const reordered = [...rep.songs];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setRepertoires((prev) => prev.map((r) => (r.id === repertoireId ? { ...r, songs: reordered } : r)));
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/repertoires/${repertoireId}/songs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((s) => s.id) }),
      });
    });
  }

  const active = repertoires.find((r) => r.id === activeId);
  const songCount = active?.songs.filter((s) => (s.itemType ?? 'song') === 'song').length ?? 0;
  const totalSec = active?.songs.reduce((acc, s) => acc + (s.durationSec ?? 0), 0) ?? 0;

  if (loading) return <div className="py-10 text-center text-muted">Carregando...</div>;

  return (
    <div>
      <div className="mb-5 flex items-center justify-end">
        {canManage && (
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>
            + Novo Setlist
          </Button>
        )}
      </div>

      {showNew && (
        <form onSubmit={handleCreateRepertoire} className="mb-5 flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do setlist (ex: Show Acústico · Verão 2026)"
            required
            autoFocus
            className="flex-1"
            aria-label="Nome do setlist"
          />
          <Button type="submit" disabled={pending}>Criar</Button>
          <Button variant="outline" type="button" onClick={() => setShowNew(false)}><IconClose size={13} /></Button>
        </form>
      )}

      {repertoires.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-14 text-center text-faint">
          <p className="mb-1 text-muted">Nenhum setlist ainda</p>
          {canManage && <p className="text-[13px]">Um setlist é o roteiro do show: músicas, falas, interações…</p>}
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Sidebar de setlists */}
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
                <div className="text-[11px] text-faint">
                  {r.songs.filter((s) => (s.itemType ?? 'song') === 'song').length} músicas
                </div>
              </button>
            ))}
          </div>

          {/* Setlist ativo */}
          {active && (
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center justify-between gap-3">
                {renaming ? (
                  <form onSubmit={handleRename} className="flex flex-1 gap-2">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      className="flex-1"
                      aria-label="Novo nome do setlist"
                    />
                    <Button size="sm" type="submit" disabled={pending}><IconCheck size={13} /></Button>
                    <Button size="sm" variant="outline" type="button" onClick={() => setRenaming(false)}><IconClose size={13} /></Button>
                  </form>
                ) : (
                  <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                    {active.name}
                    {canManage && (
                      <button
                        onClick={() => { setRenaming(true); setRenameValue(active.name); }}
                        className="text-faint transition-colors hover:text-ink"
                        title="Renomear setlist"
                      >
                        <IconEdit size={13} />
                      </button>
                    )}
                  </span>
                )}
                {!renaming && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setBlockMenuOpen(true)}>+ Adicionar bloco</Button>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={() => handleDeleteRepertoire(active.id)}>
                        Excluir
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Blocos */}
              {active.songs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-faint">
                  Roteiro vazio. Adicione blocos: músicas, falas, interações, improvisos…
                </div>
              ) : (
                <div className="flex flex-col">
                  {active.songs.map((s, i) => {
                    const def = blockDef(s.itemType);
                    const Icon = BLOCK_ICON[def.type];
                    const songNumber = active.songs.slice(0, i + 1).filter((x) => (x.itemType ?? 'song') === 'song').length;

                    if (def.type === 'section') {
                      return (
                        <div key={s.id} className="group mt-4 mb-2 flex items-center gap-3 first:mt-0">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">{s.title}</span>
                          <span className="h-px flex-1 bg-line" />
                          <BlockActions index={i} total={active.songs.length} onMove={(d) => moveBlock(active.id, i, d)} onEdit={() => openBlockForm('section', s)} onRemove={() => handleRemoveBlock(active.id, s.id)} />
                        </div>
                      );
                    }

                    return (
                      <div key={s.id} className="group relative mb-1.5">
                        <div className="flex items-center gap-3 rounded-lg border border-line bg-raised px-3.5 py-2.5">
                          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md', def.badgeClass)}>
                            {def.type === 'song'
                              ? <span className="font-mono text-[11px] font-bold">{songNumber}</span>
                              : <Icon size={13} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-sm font-semibold text-ink">{s.title}</span>
                              {def.type !== 'song' && (
                                <span className="shrink-0 text-[10px] uppercase tracking-wide text-faint">{def.label}</span>
                              )}
                            </div>
                            {def.type === 'song' && parseArtist(s.notes) && (
                              <div className="text-xs text-muted">{parseArtist(s.notes)}</div>
                            )}
                            {def.type !== 'song' && s.body && (
                              <div className="line-clamp-2 whitespace-pre-line text-xs text-muted">{s.body}</div>
                            )}
                          </div>
                          {s.songKey && (
                            <span className="shrink-0 rounded-md bg-blue-400/15 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-400">
                              {s.songKey}
                            </span>
                          )}
                          {s.bpm && <span className="shrink-0 font-mono text-[11px] text-faint">{s.bpm} bpm</span>}
                          {s.durationSec ? (
                            <span className="shrink-0 font-mono text-[11px] text-faint">{formatDuration(s.durationSec)}</span>
                          ) : null}
                          <BlockActions index={i} total={active.songs.length} onMove={(d) => moveBlock(active.id, i, d)} onEdit={() => openBlockForm(def.type, s)} onRemove={() => handleRemoveBlock(active.id, s.id)} />
                        </div>
                        {s.segue && i < active.songs.length - 1 && (
                          <div className="my-0.5 pl-6 font-mono text-[10px] uppercase tracking-wide text-accent">↓ emenda</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {active.songs.length > 0 && (
                <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-faint">
                  {songCount} {songCount === 1 ? 'música' : 'músicas'}
                  {totalSec > 0 && <> · duração ~{formatDuration(totalSec)}</>}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Menu de tipos de bloco */}
      {blockMenuOpen && (
        <Modal onClose={() => setBlockMenuOpen(false)} title="Adicionar bloco" className="max-w-lg p-7">
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_TYPES.map((b) => {
              const Icon = BLOCK_ICON[b.type];
              return (
                <button
                  key={b.type}
                  onClick={() => openBlockForm(b.type)}
                  className="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-accent hover:bg-surface"
                >
                  <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md', b.badgeClass)}>
                    <Icon size={13} />
                  </span>
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{b.label}</span>
                    <span className="block text-[11px] leading-snug text-faint">{b.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Form de bloco (música = busca no acervo; demais = título/roteiro/duração) */}
      {blockForm && (
        <Modal
          onClose={closeBlockForm}
          title={blockForm.editingId ? `Editar ${blockDef(blockForm.type).label.toLowerCase()}` : blockDef(blockForm.type).label}
          className="max-w-lg p-7"
        >
          {blockForm.type === 'song' && !blockForm.editingId ? (
            <>
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
                <form onSubmit={submitBlock} className="flex flex-col gap-3">
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
                  <div className="grid grid-cols-3 gap-2.5">
                    <Input label="Tom" value={songKey} onChange={(e) => setSongKey(e.target.value)} placeholder="Am, G…" />
                    <Input label="BPM" value={bpm} onChange={(e) => setBpm(e.target.value)} type="number" placeholder="120" />
                    <Input label="Minutos" value={blockMinutes} onChange={(e) => setBlockMinutes(e.target.value)} type="number" placeholder="4" />
                  </div>
                  <div className="mt-1 flex justify-end gap-2.5">
                    <Button variant="outline" type="button" onClick={closeBlockForm}>Cancelar</Button>
                    <Button type="submit" disabled={pending}>Adicionar</Button>
                  </div>
                </form>
              )}

              {!selected && query.length > 1 && !searching && results.length === 0 && (
                <p className="mt-2 text-[13px] text-faint">Nenhuma música encontrada para &quot;{query}&quot;</p>
              )}
            </>
          ) : (
            <form onSubmit={submitBlock} className="flex flex-col gap-3">
              {blockForm.type === 'song' ? (
                <div className="grid grid-cols-3 gap-2.5">
                  <Input label="Tom" value={songKey} onChange={(e) => setSongKey(e.target.value)} placeholder="Am, G…" />
                  <Input label="BPM" value={bpm} onChange={(e) => setBpm(e.target.value)} type="number" placeholder="120" />
                  <Input label="Minutos" value={blockMinutes} onChange={(e) => setBlockMinutes(e.target.value)} type="number" placeholder="4" />
                </div>
              ) : (
                <>
                  <Input
                    label={blockForm.type === 'section' ? 'Nome da seção' : 'Título'}
                    value={blockTitle}
                    onChange={(e) => setBlockTitle(e.target.value)}
                    placeholder={blockForm.type === 'section' ? 'Ex: Abertura, Bloco acústico, Bis' : 'Ex: Boas-vindas, Apresentação da banda'}
                    autoFocus
                    required
                  />
                  {blockForm.type !== 'section' && (
                    <>
                      <Textarea
                        label="Roteiro / texto (opcional)"
                        value={blockBody}
                        onChange={(e) => setBlockBody(e.target.value)}
                        rows={4}
                        placeholder="O que acontece nesse momento? Fala, deixa, referência…"
                      />
                      <Input
                        label="Duração em minutos (opcional)"
                        value={blockMinutes}
                        onChange={(e) => setBlockMinutes(e.target.value)}
                        type="number"
                        placeholder="Ex: 3"
                      />
                    </>
                  )}
                </>
              )}
              <div className="mt-1 flex justify-end gap-2.5">
                <Button variant="outline" type="button" onClick={closeBlockForm}>Cancelar</Button>
                <Button type="submit" disabled={pending}>{blockForm.editingId ? 'Salvar' : 'Adicionar'}</Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

// Ações compactas do bloco (subir/descer/editar/remover), visíveis no hover.
function BlockActions({
  index, total, onMove, onEdit, onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: -1 | 1) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 text-faint transition-colors hover:text-ink disabled:opacity-30" aria-label="Mover para cima">
        <IconChevronUp size={12} />
      </button>
      <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 text-faint transition-colors hover:text-ink disabled:opacity-30" aria-label="Mover para baixo">
        <IconChevronDown size={12} />
      </button>
      <button onClick={onEdit} className="p-1 text-faint transition-colors hover:text-ink" aria-label="Editar bloco">
        <IconEdit size={12} />
      </button>
      <button onClick={onRemove} className="p-1 text-faint transition-colors hover:text-red-400" aria-label="Remover bloco">
        <IconClose size={12} />
      </button>
    </span>
  );
}
