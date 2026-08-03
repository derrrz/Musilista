'use client';

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { IconHeart, IconPlay, IconPause } from '@/components/ui/icons';
import { Avatar } from '@/components/ui/Avatar';

type Candidate = {
  id: string;
  title: string;
  artist: string;
  body: string | null;
  artistSlug: string | null;
  titleSlug: string | null;
  votes: number;
  myLevel?: number | null;
};

const GUEST_ID_KEY = 'musilista_guest_id';

function getGuestId(): string {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

// Nome lembrado por link (não global) — assim quem reabre o mesmo convite
// não precisa digitar de novo, mas um convite diferente não herda o nome.
function guestNameKey(token: string) {
  return `musilista_guest_name_${token}`;
}

function cifraHref(c: Pick<Candidate, 'artistSlug' | 'titleSlug'>): string | null {
  return c.artistSlug && c.titleSlug ? `/${c.artistSlug}/${c.titleSlug}` : null;
}

// Capa do álbum (Deezer) — sem capa, cai pra foto do artista; sem nenhuma
// das duas, o Avatar mostra a inicial.
function SongCoverThumb({ title, artist }: { title: string; artist: string }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const coverUrl = `/api/song-cover?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`;
  const artistPhotoUrl = `/api/artist-photo?name=${encodeURIComponent(artist)}`;
  return (
    <Avatar
      name={artist || title}
      src={coverFailed ? artistPhotoUrl : coverUrl}
      onError={() => setCoverFailed(true)}
      size="lg"
      shape="square"
    />
  );
}

// Duplicado de propósito (mesmo componente existe em
// _components/SongPreviewButton.tsx, pro lado autenticado) — o bundle
// público não deve depender da árvore de componentes do app logado.
let currentlyPlaying: HTMLAudioElement | null = null;

type PreviewStatus = 'loading' | 'found' | 'not-found';

function useSongPreview(title: string, artist: string) {
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetch(`/api/song-preview?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`)
      .then((r) => (r.ok ? r.json() : { previewUrl: null }))
      .then((data) => {
        if (cancelled) return;
        setUrl(data.previewUrl ?? null);
        setStatus(data.previewUrl ? 'found' : 'not-found');
      })
      .catch(() => { if (!cancelled) { setUrl(null); setStatus('not-found'); } });
    return () => { cancelled = true; };
  }, [title, artist]);

  return { status, url };
}

function SongPreviewButton({ title, artist }: { title: string; artist: string }) {
  const { status, url } = useSongPreview(title, artist);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    audioRef.current?.pause();
    if (currentlyPlaying === audioRef.current) currentlyPlaying = null;
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      return;
    }
    if (currentlyPlaying && currentlyPlaying !== audio) currentlyPlaying.pause();
    currentlyPlaying = audio;
    audio.play().catch(() => {});
  }

  if (status === 'loading') {
    return <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-raised" aria-hidden="true" />;
  }

  if (status === 'not-found') {
    return (
      <span
        className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-line px-2.5 py-1.5 font-mono text-[10px] text-faint"
        title="Não achamos essa música no catálogo da Deezer"
      >
        🎧 sem prévia
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm transition-all active:scale-90 hover:opacity-90',
          playing && 'ring-4 ring-accent/25',
        )}
        title={playing ? 'Pausar trecho' : 'Ouvir trecho (30s)'}
        aria-label={playing ? 'Pausar trecho' : 'Ouvir trecho'}
      >
        {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
      </button>
      <audio
        ref={audioRef}
        src={url!}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </>
  );
}

// Intensidade cresce com a nota — não é só "cheio/vazio", o coração 1 é
// mais apagado que o 3, pra bater com a ideia de "quanto mais alto,
// mais forte".
const HEART_TINT: Record<number, string> = {
  1: 'text-accent/55',
  2: 'text-accent/78',
  3: 'text-accent',
};

function LevelPicker({
  myLevel, pending, roundOpen, canVote, onSetLevel,
}: {
  myLevel: number | null | undefined; pending: boolean; roundOpen: boolean; canVote: boolean; onSetLevel: (level: number) => void;
}) {
  // Prévia no hover: passar o mouse acende os corações até ali (como um
  // rating de estrelas), com um pulso de escala pra ficar óbvio o que vai
  // acontecer antes de clicar.
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);
  const effective = hoverLevel ?? myLevel ?? null;
  return (
    <div className="flex shrink-0 items-center gap-0.5" onMouseLeave={() => setHoverLevel(null)}>
      {[1, 2, 3].map((n) => {
        const filled = effective != null && n <= effective;
        const isPreview = hoverLevel != null && n <= hoverLevel;
        const isDisabled = pending || !canVote || (!roundOpen && n !== myLevel);
        return (
          <button
            key={n}
            type="button"
            disabled={isDisabled}
            onClick={() => onSetLevel(n)}
            onMouseEnter={() => !isDisabled && setHoverLevel(n)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 active:scale-90 disabled:opacity-30',
              filled ? HEART_TINT[n] : 'text-line hover:text-muted',
            )}
            title={`Nota ${n}`}
            aria-label={myLevel === n ? `Retirar nota ${n}` : `Dar nota ${n}`}
          >
            <IconHeart
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-150',
                filled && 'fill-current',
                isPreview ? 'scale-125 animate-heart-pulse' : 'scale-100',
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// Um card por vez, sem placar à mostra. Avança sozinho depois de votar;
// "Pular" avança sem votar; "Voltar" só navega, não desfaz voto.
function SessionCard({
  candidate, index, total, pending, editing, canBack, onSetLevel, onBack, onSkip,
}: {
  candidate: Candidate; index: number; total: number; pending: boolean; editing: boolean; canBack: boolean;
  onSetLevel: (level: number) => void; onBack: () => void; onSkip: () => void;
}) {
  const href = cifraHref(candidate);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1 font-mono text-[11px] text-muted">
          {editing ? 'Editando avaliação' : `Música ${index + 1} de ${total}`}
        </p>
        {!editing && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-accent/70 transition-all duration-300"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        )}
      </div>
      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center gap-3">
          <SongCoverThumb title={candidate.title} artist={candidate.artist} />
          <div className="min-w-0 flex-1 text-left">
            {href ? (
              <Link href={href} target="_blank" className="text-base font-semibold text-ink underline-offset-2 hover:text-accent hover:underline">
                {candidate.title}
              </Link>
            ) : (
              <p className="text-base font-semibold text-ink">{candidate.title}</p>
            )}
            {candidate.artist && <p className="text-sm text-muted">{candidate.artist}</p>}
          </div>
          <SongPreviewButton key={candidate.id} title={candidate.title} artist={candidate.artist} />
        </div>
        {candidate.body ? (
          <details className="mt-2 text-left">
            <summary className="cursor-pointer text-[11px] font-medium text-accent">Ver cifra</summary>
            <pre className="mt-1 max-h-56 overflow-auto whitespace-pre rounded-md bg-raised p-2.5 font-mono text-[11px] leading-snug text-ink">{candidate.body}</pre>
          </details>
        ) : null}
        <div className="mt-4 flex justify-center">
          <LevelPicker myLevel={candidate.myLevel} pending={pending} roundOpen canVote onSetLevel={onSetLevel} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={!canBack || pending}>Voltar</Button>
        {!editing && (
          <Button variant="ghost" size="sm" onClick={onSkip} disabled={pending}>Pular por enquanto</Button>
        )}
      </div>
    </div>
  );
}

function SessionReview({
  list, onEdit, onClose,
}: { list: Candidate[]; onEdit: (index: number) => void; onClose: () => void }) {
  const missing = list.filter((c) => c.myLevel == null);
  return (
    <div className="flex flex-col gap-3">
      {missing.length > 0 ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-500">
          Faltam {missing.length} {missing.length === 1 ? 'música' : 'músicas'} sem nota.
        </p>
      ) : (
        <p className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-xs text-accent">
          🎉 Você avaliou todas as músicas!
        </p>
      )}
      <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        {list.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onEdit(i)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left hover:bg-surface',
              c.myLevel == null ? 'border-amber-400/30' : 'border-line',
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{c.title}</p>
              {c.artist && <p className="truncate text-xs text-muted">{c.artist}</p>}
            </div>
            {c.myLevel != null ? (
              <div className="flex shrink-0 gap-0.5 text-accent">
                {[1, 2, 3].map((n) => (
                  <IconHeart key={n} className={cn('h-3 w-3', n <= c.myLevel! && 'fill-current')} />
                ))}
              </div>
            ) : (
              <span className="shrink-0 font-mono text-[10px] uppercase text-amber-500">Sem nota</span>
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={onClose}>{missing.length > 0 ? 'Fechar' : 'Concluir'}</Button>
      </div>
    </div>
  );
}

// Sessão guiada — mesma lógica do lado do membro (VotingPanel.tsx), mas
// duplicada aqui de propósito: o bundle público não deve depender da
// árvore de componentes autenticada.
function VoteSessionModal({ candidates, onVote, onClose }: {
  candidates: Candidate[];
  onVote: (candidateId: string, level: number) => Promise<void>;
  onClose: () => void;
}) {
  const [order] = useState(() => candidates.map((c) => c.id));
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const list = order.map((id) => byId.get(id)).filter((c): c is Candidate => !!c);

  const firstUnvoted = list.findIndex((c) => c.myLevel == null);
  const [index, setIndex] = useState(firstUnvoted === -1 ? 0 : firstUnvoted);
  const [mode, setMode] = useState<'voting' | 'review'>(firstUnvoted === -1 ? 'review' : 'voting');
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = list[index];

  function setLevel(level: number) {
    if (!current) return;
    startTransition(async () => {
      await onVote(current.id, level);
      advance();
    });
  }

  function advance() {
    if (editing) { setEditing(false); setMode('review'); return; }
    if (index + 1 < list.length) setIndex(index + 1);
    else setMode('review');
  }

  function back() {
    if (index > 0) setIndex(index - 1);
  }

  function editFrom(i: number) {
    setIndex(i);
    setEditing(true);
    setMode('voting');
  }

  if (list.length === 0) return null;

  return (
    <Modal title="Votação" onClose={onClose}>
      {mode === 'voting' && current ? (
        <SessionCard
          candidate={current}
          index={index}
          total={list.length}
          pending={pending}
          editing={editing}
          canBack={index > 0 && !editing}
          onSetLevel={setLevel}
          onBack={back}
          onSkip={advance}
        />
      ) : (
        <SessionReview list={list} onEdit={editFrom} onClose={onClose} />
      )}
    </Modal>
  );
}

export function VotePanel({
  token, round, initialCandidates,
}: {
  token: string;
  round: { id: string; status: 'open' | 'closed' };
  initialCandidates: Candidate[];
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [status, setStatus] = useState(round.status);
  const [name, setName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setGuestId(getGuestId());
    const savedName = localStorage.getItem(guestNameKey(token));
    if (savedName) {
      setName(savedName);
      setNameConfirmed(true);
    }
  }, [token]);

  const load = useCallback(async () => {
    if (!guestId) return;
    const res = await fetch(`/api/public/vote/${token}?guestId=${guestId}`);
    if (res.ok) {
      const data = await res.json();
      setCandidates(data.candidates);
      setStatus(data.round.status);
    }
  }, [token, guestId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (status !== 'open') return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [status, load]);

  const canVote = nameConfirmed && name.trim().length > 0 && !!guestId;
  const total = candidates.length;
  const done = candidates.filter((c) => c.myLevel != null).length;

  function confirmName() {
    if (!name.trim()) return;
    localStorage.setItem(guestNameKey(token), name.trim());
    setNameConfirmed(true);
  }

  function setLevel(candidateId: string, level: number): Promise<void> {
    if (!guestId || !canVote) return Promise.resolve();
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        await fetch(`/api/public/vote/${token}/candidates/${candidateId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guestId, guestName: name.trim(), level }),
        });
        setHasVoted(true);
        await load();
        resolve();
      });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {status === 'closed' ? (
        <p className="rounded-lg border border-dashed border-line py-8 text-center text-sm text-muted">
          Essa votação já foi encerrada — esse link não aceita mais votos.
        </p>
      ) : (
        <>
          {!nameConfirmed && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="mb-2 text-sm font-medium text-ink">Como você se chama?</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) confirmName(); }}
                />
                <Button size="sm" disabled={!name.trim()} onClick={confirmName}>Entrar</Button>
              </div>
            </div>
          )}

          {nameConfirmed && (
            <p className="text-xs text-muted">Votando como <span className="font-medium text-ink">{name}</span></p>
          )}

          {candidates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
              Nenhuma música na lista ainda.
            </p>
          ) : nameConfirmed ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-5 text-center">
              <p className="text-sm text-ink">
                {done === 0
                  ? `${total} ${total === 1 ? 'música' : 'músicas'} esperando sua nota.`
                  : done === total
                    ? `Você avaliou todas as ${total} músicas.`
                    : `Você já avaliou ${done} de ${total} músicas.`}
              </p>
              <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-accent/70 transition-all duration-500"
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
              <Button size="sm" onClick={() => setShowSession(true)}>
                {done === 0 ? 'Votar agora' : done === total ? 'Revisar meus votos' : 'Continuar votação'}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted">Diga seu nome pra começar a votar.</p>
          )}
        </>
      )}

      {showSession && (
        <VoteSessionModal
          candidates={candidates}
          onVote={setLevel}
          onClose={() => setShowSession(false)}
        />
      )}

      {hasVoted && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center">
          <p className="text-sm text-ink">Curtiu participar? Crie sua conta no Musilista pra fazer parte do grupo de verdade.</p>
          <Link href="/login" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
            Entrar / Criar conta
          </Link>
        </div>
      )}
    </div>
  );
}
