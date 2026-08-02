'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/components/ui/cn';
import { IconClose, IconPlay, IconShare } from '@/components/ui/icons';

type Reference = {
  id: string;
  url: string | null;
  title: string | null;
  kind: string;
  note: string | null;
  artist: string | null;
  importedSongId: string | null;
  artistSlug: string | null;
  titleSlug: string | null;
  addedBy: string;
  addedByName: string | null;
  createdAt: string;
};
type SongResult = { id: string; title: string; artist: string };

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function hostLabel(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// Referências da banda: links (YouTube, Spotify…) que compõem a característica
// sonora/visual do grupo, e músicas levantadas em brainstorm pelos membros —
// pool de ideias, separado e independente do setlist e da votação.
export function ReferencesPanel({ groupId, myUserId, canManage }: { groupId: string; myUserId: string; canManage: boolean }) {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<'link' | 'song'>('link');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  // modo música: busca no acervo, com fallback manual (mesmo padrão do VotingPanel)
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<SongResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/references`);
    if (res.ok) setReferences(await res.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setUrl(''); setNote(''); setError(''); setShowAdd(false); setMode('link');
    setSongQuery(''); setSongResults([]); setSelectedSong(null); setManualTitle(''); setManualArtist('');
  }

  function handleSongSearch(q: string) {
    setSongQuery(q);
    setSelectedSong(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSongResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/directory?q=${encodeURIComponent(q)}&limit=6`);
      if (res.ok) setSongResults((await res.json()).songs ?? []);
    }, 350);
  }

  function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Não foi possível adicionar.');
        return;
      }
      const ref = await res.json();
      setReferences((prev) => [ref, ...prev]);
      resetForm();
    });
  }

  function handleAddSong(title: string, artist: string, importedSongId?: string) {
    setError('');
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, importedSongId, note }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? 'Não foi possível adicionar.');
        return;
      }
      const ref = await res.json();
      setReferences((prev) => [ref, ...prev]);
      resetForm();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/references/${id}`, { method: 'DELETE' });
      setReferences((prev) => prev.filter((r) => r.id !== id));
    });
  }

  if (loading) return <div className="py-6 text-center text-sm text-muted">Carregando…</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>+ Adicionar referência</Button>
      </div>

      {showAdd && (
        <div className="mb-5 flex flex-col gap-2.5 rounded-xl border border-line bg-surface/60 p-4">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode('link')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', mode === 'link' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink')}
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => setMode('song')}
              className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', mode === 'song' ? 'bg-accent/15 text-accent' : 'text-muted hover:text-ink')}
            >
              Música
            </button>
          </div>

          {mode === 'link' ? (
            <form onSubmit={handleAddLink} className="flex flex-col gap-2.5">
              <Input
                label="Link"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/… ou https://open.spotify.com/…"
                required
                autoFocus
                type="url"
              />
              <Textarea
                label="Por que essa referência? (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="Ex: vibe da bateria nesse arranjo; timbre de guitarra do refrão…"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={resetForm}>Cancelar</Button>
                <Button type="submit" disabled={pending}>Adicionar</Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-2.5">
              <Input
                value={songQuery}
                onChange={(e) => handleSongSearch(e.target.value)}
                placeholder="Buscar no acervo…"
                autoFocus
              />
              {songResults.length > 0 && !selectedSong && (
                <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-line">
                  {songResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelectedSong(s); setSongQuery(`${s.title} — ${s.artist}`); setSongResults([]); }}
                      className="px-3 py-2 text-left text-sm hover:bg-surface"
                    >
                      <span className="text-ink">{s.title}</span>
                      <span className="ml-2 text-xs text-muted">{s.artist}</span>
                    </button>
                  ))}
                </div>
              )}
              {songQuery.trim().length > 1 && !selectedSong && songResults.length === 0 && (
                <p className="text-[13px] text-faint">Não achamos no acervo — pode adicionar manualmente abaixo.</p>
              )}
              {!selectedSong && (
                <>
                  <p className="text-center text-[11px] text-faint">— ou digite manualmente —</p>
                  <div className="flex gap-2">
                    <Input placeholder="Título" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
                    <Input placeholder="Artista" value={manualArtist} onChange={(e) => setManualArtist(e.target.value)} />
                  </div>
                </>
              )}
              <Textarea
                label="Nota (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="Por que essa música? Onde ouviu, o que te lembrou…"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={resetForm}>Cancelar</Button>
                <Button
                  type="button"
                  disabled={pending || (!selectedSong && !manualTitle.trim())}
                  onClick={() => selectedSong
                    ? handleAddSong(selectedSong.title, selectedSong.artist, selectedSong.id)
                    : handleAddSong(manualTitle.trim(), manualArtist.trim())}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {references.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
          <p>Nenhuma referência ainda.</p>
          <p className="mt-1 text-xs text-faint">
            Sons, clipes, artistas e músicas levantadas que definem a cara do grupo — qualquer membro pode adicionar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {references.map((r) => {
            const canDelete = r.addedBy === myUserId || canManage;

            if (r.kind === 'song') {
              const cifraHref = r.artistSlug && r.titleSlug ? `/${r.artistSlug}/${r.titleSlug}` : null;
              return (
                <div key={r.id} className="group flex flex-col gap-1 rounded-xl border border-line bg-raised p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    {cifraHref ? (
                      <Link href={cifraHref} target="_blank" className="line-clamp-2 text-[13px] font-semibold text-ink hover:text-accent">
                        {r.title}
                      </Link>
                    ) : (
                      <span className="line-clamp-2 text-[13px] font-semibold text-ink">{r.title}</span>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleRemove(r.id)}
                        className="shrink-0 p-0.5 text-faint opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                        aria-label="Remover referência"
                      >
                        <IconClose size={12} />
                      </button>
                    )}
                  </div>
                  {r.artist && <p className="text-xs text-muted">{r.artist}</p>}
                  {r.note && <p className="line-clamp-3 text-xs leading-relaxed text-muted">{r.note}</p>}
                  <p className="mt-auto pt-1 font-mono text-[10px] text-faint">
                    🎵 Música{r.addedByName ? ` · ${r.addedByName}` : ''}
                  </p>
                </div>
              );
            }

            const ytId = r.kind === 'youtube' && r.url ? youtubeId(r.url) : null;
            return (
              <div key={r.id} className="group flex flex-col overflow-hidden rounded-xl border border-line bg-raised">
                <a href={r.url ?? undefined} target="_blank" rel="noreferrer" className="block">
                  {ytId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                      alt={r.title ?? 'Vídeo do YouTube'}
                      className="aspect-video w-full object-cover transition-opacity hover:opacity-90"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-surface text-muted">
                      {r.kind === 'spotify' ? <IconPlay size={22} /> : <IconShare size={20} />}
                    </div>
                  )}
                </a>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <a href={r.url ?? undefined} target="_blank" rel="noreferrer" className="line-clamp-2 text-[13px] font-semibold text-ink hover:text-accent">
                      {r.title ?? (r.url ? hostLabel(r.url) : '')}
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => handleRemove(r.id)}
                        className="shrink-0 p-0.5 text-faint opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                        aria-label="Remover referência"
                      >
                        <IconClose size={12} />
                      </button>
                    )}
                  </div>
                  {r.note && <p className="line-clamp-3 text-xs leading-relaxed text-muted">{r.note}</p>}
                  <p className="mt-auto pt-1 font-mono text-[10px] text-faint">
                    {r.url ? hostLabel(r.url) : ''}{r.addedByName ? ` · ${r.addedByName}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
