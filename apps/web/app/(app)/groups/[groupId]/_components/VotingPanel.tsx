'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import { IconHeart, IconPlus, IconClose } from '@/components/ui/icons';

type Candidate = {
  id: string;
  title: string;
  artist: string;
  artistSlug: string | null;
  titleSlug: string | null;
  votes: number;
  votedByMe: boolean;
};

// URL canônica da cifra quando a sugestão bateu no acervo; sem slug (sugestão
// digitada à mão) não tem cifra pra linkar.
function cifraHref(c: Pick<Candidate, 'artistSlug' | 'titleSlug'>): string | null {
  return c.artistSlug && c.titleSlug ? `/${c.artistSlug}/${c.titleSlug}` : null;
}
type VotingRound = {
  id: string;
  title: string;
  status: 'open' | 'closed';
  maxVotesPerMember: number;
  createdBy: string;
  resultRepertoireId: string | null;
  candidates: Candidate[];
  myVotesUsed: number;
};
type SongResult = { id: string; title: string; artist: string; artistSlug: string | null; titleSlug: string | null };

const MEDALS = ['🥇', '🥈', '🥉'];

function CandidateRow({
  candidate, rank, leaderVotes, canVote, onToggle, pending,
}: {
  candidate: Candidate; rank: number; leaderVotes: number; canVote: boolean;
  onToggle: () => void; pending: boolean;
}) {
  const pct = leaderVotes > 0 ? Math.round((candidate.votes / leaderVotes) * 100) : 0;
  const href = cifraHref(candidate);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
      <span className="w-6 shrink-0 text-center text-base">{MEDALS[rank] ?? ''}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {href ? (
            <Link href={href} target="_blank" className="truncate text-sm font-medium text-ink underline-offset-2 hover:text-accent hover:underline">
              {candidate.title}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium text-ink">{candidate.title}</p>
          )}
          <span className="shrink-0 font-mono text-xs text-muted">{candidate.votes} {candidate.votes === 1 ? 'voto' : 'votos'}</span>
        </div>
        {candidate.artist && <p className="truncate text-xs text-muted">{candidate.artist}</p>}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent/70 transition-all duration-500"
            style={{ width: `${Math.max(candidate.votes > 0 ? 4 : 0, pct)}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!canVote || pending}
        onClick={onToggle}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all active:scale-90 disabled:opacity-40',
          candidate.votedByMe ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:text-ink',
        )}
        aria-label={candidate.votedByMe ? 'Retirar voto' : 'Votar'}
      >
        <IconHeart className={cn('h-4 w-4', candidate.votedByMe && 'fill-current')} />
      </button>
    </div>
  );
}

function RoundCard({ round, groupId, canManage, myUserId, onChange }: {
  round: VotingRound; groupId: string; canManage: boolean; myUserId: string;
  onChange: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SongResult[]>([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sorted = [...round.candidates].sort((a, b) => b.votes - a.votes);
  const leaderVotes = sorted[0]?.votes ?? 0;
  const canManageThis = canManage || round.createdBy === myUserId;

  function handleSearch(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/directory?q=${encodeURIComponent(q)}&limit=6`);
      if (res.ok) setResults((await res.json()).songs ?? []);
    }, 350);
  }

  function addCandidate(title: string, artist: string, importedSongId?: string) {
    setAddError(null);
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/votes/${round.id}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, importedSongId }),
      });
      if (res.ok) {
        setShowAdd(false); setQuery(''); setResults([]); setManualTitle(''); setManualArtist('');
        onChange();
      } else {
        const data = await res.json().catch(() => null);
        setAddError(data?.error ?? 'Erro ao sugerir música.');
      }
    });
  }

  function toggleVote(candidateId: string) {
    setPendingId(candidateId);
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${round.id}/candidates/${candidateId}`, { method: 'POST' });
      onChange();
      setPendingId(null);
    });
  }

  function close() {
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${round.id}/close`, { method: 'POST' });
      onChange();
    });
  }

  function buildSet() {
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/votes/${round.id}/build-set`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (res.ok) onChange();
    });
  }

  function removeRound() {
    if (!confirm('Excluir essa votação e todos os votos?')) return;
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${round.id}`, { method: 'DELETE' });
      onChange();
    });
  }

  const votesLeft = round.maxVotesPerMember - round.myVotesUsed;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{round.title}</p>
          <p className="text-xs text-muted">
            {round.status === 'open'
              ? `Aberta · você tem ${votesLeft} de ${round.maxVotesPerMember} ${votesLeft === 1 ? 'voto' : 'votos'} sobrando`
              : 'Encerrada'}
          </p>
        </div>
        {round.status === 'open'
          ? <span className="shrink-0 rounded-md border border-accent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">🔥 Ao vivo</span>
          : <span className="shrink-0 rounded-md border border-line px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Fechada</span>}
      </div>

      {sorted.length === 0 && (
        <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
          Nenhuma música sugerida ainda — seja o primeiro!
        </p>
      )}

      <div className="flex flex-col gap-2">
        {sorted.map((c, i) => (
          <CandidateRow
            key={c.id}
            candidate={c}
            rank={i}
            leaderVotes={leaderVotes}
            canVote={round.status === 'open' && (c.votedByMe || votesLeft > 0)}
            pending={busy && pendingId === c.id}
            onToggle={() => toggleVote(c.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {round.status === 'open' && (
          <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}>
            <IconPlus className="h-3.5 w-3.5" /> Sugerir música
          </Button>
        )}
        {round.resultRepertoireId && (
          <span className="text-xs text-muted">🎉 Set criado a partir do resultado</span>
        )}
        <div className="flex-1" />
        {canManageThis && round.status === 'open' && (
          <Button size="sm" variant="ghost" onClick={close} disabled={busy}>Encerrar votação</Button>
        )}
        {canManage && sorted.some((c) => c.votes > 0) && (
          <Button size="sm" onClick={buildSet} disabled={busy}>Criar set com o resultado</Button>
        )}
        {canManageThis && (
          <Button size="sm" variant="ghost" onClick={removeRound} disabled={busy} className="text-red-400 hover:text-red-300">
            Excluir
          </Button>
        )}
      </div>

      {showAdd && (
        <Modal title="Sugerir música pra votação" onClose={() => setShowAdd(false)}>
          <div className="flex flex-col gap-3">
            <Input placeholder="Buscar no acervo…" value={query} onChange={(e) => handleSearch(e.target.value)} autoFocus />
            {results.length > 0 && (
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => addCandidate(r.title, r.artist, r.id)}
                    className="rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    <span className="text-ink">{r.title}</span>
                    <span className="ml-2 text-xs text-muted">{r.artist}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-center text-[11px] text-faint">— ou digite manualmente —</p>
            <div className="flex gap-2">
              <Input placeholder="Título" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
              <Input placeholder="Artista" value={manualArtist} onChange={(e) => setManualArtist(e.target.value)} />
            </div>
            {addError && <p className="text-xs text-red-400">{addError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}><IconClose className="h-3.5 w-3.5" /> Cancelar</Button>
              <Button size="sm" disabled={!manualTitle.trim() || busy} onClick={() => addCandidate(manualTitle.trim(), manualArtist.trim())}>
                Adicionar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function VotingPanel({ groupId, canManage, myUserId }: { groupId: string; canManage: boolean; myUserId: string }) {
  const [rounds, setRounds] = useState<VotingRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMaxVotes, setNewMaxVotes] = useState('3');
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/votes`);
    if (res.ok) setRounds(await res.json());
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  // Enquanto tiver uma rodada aberta, atualiza sozinho — parte da graça é
  // ver o placar mudando ao vivo enquanto o pessoal vota junto.
  useEffect(() => {
    if (!rounds.some((r) => r.status === 'open')) return;
    const id = setInterval(load, 4000);
    return () => clearInterval(id);
  }, [rounds, load]);

  function createRound(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), maxVotesPerMember: Number(newMaxVotes) || 3 }),
      });
      if (res.ok) {
        setNewTitle(''); setNewMaxVotes('3'); setShowNew(false);
        load();
      }
    });
  }

  if (loading) return <p className="font-mono text-xs text-muted">Carregando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Sugira músicas e vote — a mais votada vira o próximo set.</p>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <IconPlus className="h-3.5 w-3.5" /> Nova votação
        </Button>
      </div>

      {rounds.length === 0 && (
        <div className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">
          Nenhuma votação ainda — que tal começar uma?
        </div>
      )}

      {rounds.map((r) => (
        <RoundCard key={r.id} round={r} groupId={groupId} canManage={canManage} myUserId={myUserId} onChange={load} />
      ))}

      {showNew && (
        <Modal title="Nova votação" onClose={() => setShowNew(false)}>
          <form onSubmit={createRound} className="flex flex-col gap-3">
            <Input
              placeholder="Ex: Set do show de sábado"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <label className="flex items-center justify-between text-xs text-muted">
              Votos por pessoa
              <Input
                type="number"
                min={1}
                max={10}
                value={newMaxVotes}
                onChange={(e) => setNewMaxVotes(e.target.value)}
                className="h-8 w-16 text-center"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={!newTitle.trim() || pending}>Criar votação</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
