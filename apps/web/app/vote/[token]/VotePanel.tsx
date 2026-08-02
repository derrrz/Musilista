'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/components/ui/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IconHeart } from '@/components/ui/icons';

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

function cifraHref(c: Pick<Candidate, 'artistSlug' | 'titleSlug'>): string | null {
  return c.artistSlug && c.titleSlug ? `/${c.artistSlug}/${c.titleSlug}` : null;
}

function LevelPicker({
  myLevel, pending, roundOpen, canVote, onSetLevel,
}: {
  myLevel: number | null | undefined; pending: boolean; roundOpen: boolean; canVote: boolean; onSetLevel: (level: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {[1, 2, 3].map((n) => {
        const filled = myLevel != null && n <= myLevel;
        const isDisabled = pending || !canVote || (!roundOpen && n !== myLevel);
        return (
          <button
            key={n}
            type="button"
            disabled={isDisabled}
            onClick={() => onSetLevel(n)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-30',
              filled ? 'text-accent' : 'text-line hover:text-muted',
            )}
            title={`Nota ${n}`}
            aria-label={myLevel === n ? `Retirar nota ${n}` : `Dar nota ${n}`}
          >
            <IconHeart className={cn('h-3.5 w-3.5', filled && 'fill-current')} />
          </button>
        );
      })}
    </div>
  );
}

export function VotePanel({
  token, inviteId, invitedName, round, initialCandidates,
}: {
  token: string;
  inviteId: string | null;
  invitedName: string | null;
  round: { id: string; status: 'open' | 'closed' };
  initialCandidates: Candidate[];
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [status, setStatus] = useState(round.status);
  const [name, setName] = useState(invitedName ?? '');
  const [nameConfirmed, setNameConfirmed] = useState(!!invitedName);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    setGuestId(getGuestId());
  }, []);

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

  const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
  const canVote = nameConfirmed && name.trim().length > 0 && !!guestId;

  function setLevel(candidateId: string, level: number) {
    if (!guestId || !canVote) return;
    setPendingId(candidateId);
    startTransition(async () => {
      await fetch(`/api/public/vote/${token}/candidates/${candidateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, guestName: name.trim(), level, inviteId }),
      });
      setHasVoted(true);
      await load();
      setPendingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!nameConfirmed && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="mb-2 text-sm font-medium text-ink">Como você se chama?</p>
          <div className="flex gap-2">
            <Input
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) setNameConfirmed(true); }}
            />
            <Button size="sm" disabled={!name.trim()} onClick={() => setNameConfirmed(true)}>Entrar</Button>
          </div>
        </div>
      )}

      {nameConfirmed && invitedName && (
        <p className="text-xs text-muted">Votando como <span className="font-medium text-ink">{name}</span></p>
      )}

      <p className="text-xs text-muted">
        {status === 'open' ? 'Dê de 1 a 3 corações pra cada música.' : 'Essa votação foi encerrada.'}
      </p>

      {sorted.length === 0 && (
        <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
          Nenhuma música na lista ainda.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((c) => {
          const href = cifraHref(c);
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  {href ? (
                    <Link href={href} target="_blank" className="truncate text-sm font-medium text-ink underline-offset-2 hover:text-accent hover:underline">
                      {c.title}
                    </Link>
                  ) : (
                    <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                  )}
                  <span className="shrink-0 font-mono text-xs text-muted">{c.votes} {c.votes === 1 ? 'ponto' : 'pontos'}</span>
                </div>
                {c.artist && <p className="truncate text-xs text-muted">{c.artist}</p>}
                {c.body && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] font-medium text-accent">Ver cifra</summary>
                    <pre className="mt-1 max-h-72 overflow-auto whitespace-pre rounded-md bg-raised p-2.5 font-mono text-[11px] leading-snug text-ink">{c.body}</pre>
                  </details>
                )}
              </div>
              <LevelPicker
                myLevel={c.myLevel}
                pending={busy && pendingId === c.id}
                roundOpen={status === 'open'}
                canVote={canVote}
                onSetLevel={(level) => setLevel(c.id, level)}
              />
            </div>
          );
        })}
      </div>

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
