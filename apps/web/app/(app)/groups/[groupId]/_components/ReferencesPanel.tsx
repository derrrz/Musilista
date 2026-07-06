'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { IconClose, IconPlay, IconShare } from '@/components/ui/icons';

type Reference = {
  id: string;
  url: string;
  title: string | null;
  kind: string;
  note: string | null;
  addedBy: string;
  addedByName: string | null;
  createdAt: string;
};

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

// Referências da banda: links que os membros adicionam (YouTube, Spotify…)
// e que vão desenhando a característica sonora do grupo.
export function ReferencesPanel({ groupId, myUserId, canManage }: { groupId: string; myUserId: string; canManage: boolean }) {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/references`);
    if (res.ok) setReferences(await res.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  function handleAdd(e: React.FormEvent) {
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
      setUrl('');
      setNote('');
      setShowAdd(false);
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
        <form onSubmit={handleAdd} className="mb-5 flex flex-col gap-2.5 rounded-xl border border-line bg-surface/60 p-4">
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
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={pending}>Adicionar</Button>
          </div>
        </form>
      )}

      {references.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
          <p>Nenhuma referência ainda.</p>
          <p className="mt-1 text-xs text-faint">
            Sons, clipes e artistas que definem a cara do grupo — qualquer membro pode adicionar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {references.map((r) => {
            const ytId = r.kind === 'youtube' ? youtubeId(r.url) : null;
            const canDelete = r.addedBy === myUserId || canManage;
            return (
              <div key={r.id} className="group flex flex-col overflow-hidden rounded-xl border border-line bg-raised">
                <a href={r.url} target="_blank" rel="noreferrer" className="block">
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
                    <a href={r.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-[13px] font-semibold text-ink hover:text-accent">
                      {r.title ?? hostLabel(r.url)}
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
                    {hostLabel(r.url)}{r.addedByName ? ` · ${r.addedByName}` : ''}
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
