'use client';

import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';
import { IconHeart, IconPlus, IconClose, IconShare } from '@/components/ui/icons';
import { SongPreviewButton } from './SongPreviewButton';
import { SongCoverThumb } from './SongCoverThumb';

type Candidate = {
  id: string;
  title: string;
  artist: string;
  body: string | null;
  artistSlug: string | null;
  titleSlug: string | null;
  votes: number;
  myLevel: number | null;
};

type Participant = { name: string | null; given: number; max: number; guestId: string | null };

// URL canônica da cifra quando a sugestão bateu no acervo; sem slug (sugestão
// digitada à mão) não tem cifra pra linkar.
function cifraHref(c: Pick<Candidate, 'artistSlug' | 'titleSlug'>): string | null {
  return c.artistSlug && c.titleSlug ? `/${c.artistSlug}/${c.titleSlug}` : null;
}

// Sugestão manual (sem bater no acervo) dispara um feedback pro time avaliar
// incluir a cifra — silencioso, não bloqueia nem alerta o usuário se falhar.
function suggestCifraCreation(title: string, artist: string, pathname: string | null) {
  const form = new FormData();
  form.set('message', `Sugestão de cifra pro acervo: "${title}"${artist ? ` — ${artist}` : ''} (pedida numa votação de grupo, não encontrada na busca).`);
  form.set('pageUrl', pathname ?? '');
  fetch('/api/feedback', { method: 'POST', body: form }).catch(() => {});
}
type VotingRound = {
  id: string;
  title: string;
  status: 'open' | 'closed';
  createdBy: string;
  resultRepertoireId: string | null;
  inviteToken: string | null;
  candidates: Candidate[];
  participants: Participant[];
};
type SongResult = { id: string; title: string; artist: string; artistSlug: string | null; titleSlug: string | null };
// Payload solto via drag-and-drop de um SetlistCard (RepertoirePanel) —
// carregado no dataTransfer, não em estado React (componentes irmãos).
type DraggedSetlist = { repertoireId: string; name: string; songs: { id: string; title: string; artist: string; body: string | null }[] };

const MEDALS = ['🥇', '🥈', '🥉'];

// 3 corações = nota de 1 a 3 pra essa música (não é "quantidade de votos
// pra gastar" — cada música recebe uma nota independente das outras).
// Clicar na nota já marcada retira o voto; clicar numa nota diferente troca.
// Intensidade cresce com a nota — não é só "cheio/vazio", o coração 1 é
// mais apagado que o 3, pra bater com a ideia de "quanto mais alto,
// mais forte".
const HEART_TINT: Record<number, string> = {
  1: 'text-accent/55',
  2: 'text-accent/78',
  3: 'text-accent',
};

function LevelPicker({
  myLevel, pending, roundOpen, onSetLevel,
}: {
  myLevel: number | null; pending: boolean; roundOpen: boolean; onSetLevel: (level: number) => void;
}) {
  // Prévia no hover: passar o mouse acende os corações até ali (como um
  // rating de estrelas), com um pulso de escala pra ficar óbvio o que vai
  // acontecer antes de clicar.
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);
  const effective = hoverLevel ?? myLevel;
  return (
    <div className="flex shrink-0 items-center gap-0.5" onMouseLeave={() => setHoverLevel(null)}>
      {[1, 2, 3].map((n) => {
        const filled = effective !== null && n <= effective;
        const isPreview = hoverLevel !== null && n <= hoverLevel;
        // com a rodada fechada, só o coração já marcado fica clicável (pra
        // permitir retirar o voto, nunca pra dar nota nova)
        const isDisabled = pending || (!roundOpen && n !== myLevel);
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

function CandidateRow({
  candidate, rank, leaderVotes, roundOpen, onSetLevel, pending,
}: {
  candidate: Candidate; rank: number; leaderVotes: number; roundOpen: boolean;
  onSetLevel: (level: number) => void; pending: boolean;
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
          <span className="shrink-0 font-mono text-xs text-muted">{candidate.votes} {candidate.votes === 1 ? 'ponto' : 'pontos'}</span>
        </div>
        {candidate.artist && <p className="truncate text-xs text-muted">{candidate.artist}</p>}
        {candidate.body ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-[11px] font-medium text-accent">Ver cifra</summary>
            <pre className="mt-1 max-h-72 overflow-auto whitespace-pre rounded-md bg-raised p-2.5 font-mono text-[11px] leading-snug text-ink">{candidate.body}</pre>
          </details>
        ) : !href && (
          <p className="truncate text-[11px] text-faint">🎸 Cifra ainda não existe no Musilista — já avisamos o time</p>
        )}
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent/70 transition-all duration-500"
            style={{ width: `${Math.max(candidate.votes > 0 ? 4 : 0, pct)}%` }}
          />
        </div>
      </div>
      <LevelPicker myLevel={candidate.myLevel} pending={pending} roundOpen={roundOpen} onSetLevel={onSetLevel} />
    </div>
  );
}

// Quem já votou e quanto — só participação (quantas músicas já avaliadas
// sobre o total), nunca em qual música cada nota foi dada. Visível pra
// todo mundo, inclusive quem administra o grupo.
// Convidados (guestId preenchido) podem ter seus dados apagados por quem
// administra o grupo — são pessoas de fora, sem conta nem vínculo com o
// grupo, então o convite pode ser desfeito a qualquer momento.
function ProgressPanel({
  participants, groupId, roundId, canManage, onChange,
}: {
  participants: Participant[]; groupId: string; roundId: string; canManage: boolean; onChange: () => void;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function removeGuest(guestId: string) {
    if (!confirm('Excluir os votos desse convidado?')) return;
    setRemovingId(guestId);
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${roundId}/guests/${guestId}`, { method: 'DELETE' });
      setRemovingId(null);
      onChange();
    });
  }

  if (participants.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Quem já votou</p>
      <div className="flex flex-col gap-1.5">
        {participants.map((p, i) => {
          const pct = p.max > 0 ? Math.min(100, Math.round((p.given / p.max) * 100)) : 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate text-xs text-ink">{p.name ?? '—'}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                <div
                  className="h-full rounded-full bg-accent/70 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-mono text-[11px] text-muted">{p.given}/{p.max}</span>
              {canManage && p.guestId && (
                <button
                  type="button"
                  onClick={() => removeGuest(p.guestId!)}
                  disabled={busy && removingId === p.guestId}
                  className="shrink-0 text-faint transition-colors hover:text-red-500 disabled:opacity-40"
                  title="Excluir dados desse convidado"
                  aria-label={`Excluir dados de ${p.name ?? 'convidado'}`}
                >
                  <IconClose className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Modal do gerente pra convidar gente de fora — um único link por rodada,
// sem precisar dizer nome de ninguém antes. Quem usar o link entra com o
// próprio nome na hora de votar; se mais de uma pessoa usar o mesmo link,
// os votos só acumulam (cada um com seu guestId), sem segregar por quem
// "recebeu" o convite. Convidado só acessa essa rodada, nunca o grupo.
function InviteModal({ groupId, round, onClose }: { groupId: string; round: VotingRound; onClose: () => void }) {
  const [genericUrl, setGenericUrl] = useState<string | null>(
    round.inviteToken && typeof window !== 'undefined' ? `${window.location.origin}/vote/${round.inviteToken}` : null,
  );
  const [copied, setCopied] = useState(false);
  const [busy, startTransition] = useTransition();

  function flashCopied() {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function generateGeneric() {
    startTransition(async () => {
      const res = await fetch(`/api/groups/${groupId}/votes/${round.id}/invite`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGenericUrl(data.url);
        navigator.clipboard?.writeText(data.url).catch(() => {});
        flashCopied();
      }
    });
  }

  function copyGeneric() {
    if (!genericUrl) return;
    navigator.clipboard?.writeText(genericUrl).catch(() => {});
    flashCopied();
  }

  return (
    <Modal title="Convidar por link" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="text-[11px] text-faint">
          Quem tiver o link vota digitando o próprio nome, sem precisar de conta. Se mais de uma
          pessoa usar o mesmo link, os votos de cada uma são contados à parte. O link só funciona
          enquanto a votação estiver aberta.
        </p>
        <Button size="sm" variant="outline" onClick={genericUrl ? copyGeneric : generateGeneric} disabled={busy}>
          <IconShare className="h-3.5 w-3.5" /> {copied ? 'Copiado!' : genericUrl ? 'Copiar link' : 'Gerar link'}
        </Button>
      </div>
    </Modal>
  );
}

// Um card por vez — nada de placar ou ranking à mostra (sem prévia de
// resultado pra ninguém, igual o painel de progresso). Avança sozinho
// depois de votar; "Pular" avança sem votar; "Voltar" só navega, não
// desfaz voto.
function SessionCard({
  candidate, index, total, pending, editing, canBack, onSetLevel, onBack, onSkip, autoPlay, onPlayingChange,
}: {
  candidate: Candidate; index: number; total: number; pending: boolean; editing: boolean; canBack: boolean;
  onSetLevel: (level: number) => void; onBack: () => void; onSkip: () => void;
  autoPlay: boolean; onPlayingChange: (playing: boolean) => void;
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
          <SongCoverThumb title={candidate.title} artist={candidate.artist} size="lg" />
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
          <SongPreviewButton
            key={candidate.id}
            title={candidate.title}
            artist={candidate.artist}
            autoPlay={autoPlay}
            onPlayingChange={onPlayingChange}
          />
        </div>
        {candidate.body ? (
          <details className="mt-2 text-left">
            <summary className="cursor-pointer text-[11px] font-medium text-accent">Ver cifra</summary>
            <pre className="mt-1 max-h-56 overflow-auto whitespace-pre rounded-md bg-raised p-2.5 font-mono text-[11px] leading-snug text-ink">{candidate.body}</pre>
          </details>
        ) : !href && (
          <p className="mt-2 text-[11px] text-faint">🎸 Cifra ainda não existe no Musilista</p>
        )}
        <div className="mt-4 flex justify-center">
          <LevelPicker myLevel={candidate.myLevel} pending={pending} roundOpen onSetLevel={onSetLevel} />
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

// Sessão guiada — uma música por vez, sem mostrar placar. A ordem é fixada
// na abertura (não muda se o placar mudar) pra não confundir quem tá no
// meio da avaliação. Termina numa revisão onde dá pra voltar e trocar
// qualquer nota antes de fechar.
function VoteSessionModal({ round, groupId, onChange, onClose }: {
  round: VotingRound; groupId: string; onChange: () => void; onClose: () => void;
}) {
  const [order] = useState(() => round.candidates.map((c) => c.id));
  const byId = new Map(round.candidates.map((c) => [c.id, c]));
  const list = order.map((id) => byId.get(id)).filter((c): c is Candidate => !!c);

  const firstUnvoted = list.findIndex((c) => c.myLevel == null);
  const [index, setIndex] = useState(firstUnvoted === -1 ? 0 : firstUnvoted);
  const [mode, setMode] = useState<'voting' | 'review'>(firstUnvoted === -1 ? 'review' : 'voting');
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  // "Modo rádio": liga quando o usuário aperta play manualmente, some
  // quando pausa manualmente — não é state (não deve causar re-render),
  // só influencia se a PRÓXIMA música tenta tocar sozinha ao aparecer.
  const autoplayRef = useRef(false);

  const current = list[index];

  function setLevel(level: number) {
    if (!current) return;
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${round.id}/candidates/${current.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
      onChange();
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
          autoPlay={autoplayRef.current}
          onPlayingChange={(playing) => { autoplayRef.current = playing; }}
        />
      ) : (
        <SessionReview list={list} onEdit={editFrom} onClose={onClose} />
      )}
    </Modal>
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
  const [dragOver, setDragOver] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [importSource, setImportSource] = useState<DraggedSetlist | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  const sorted = [...round.candidates].sort((a, b) => b.votes - a.votes);
  const leaderVotes = sorted[0]?.votes ?? 0;
  const canManageThis = canManage || round.createdBy === myUserId;
  const sessionTotal = round.candidates.length;
  const sessionDone = round.candidates.filter((c) => c.myLevel != null).length;

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
        if (!importedSongId) suggestCifraCreation(title, artist, pathname);
        setShowAdd(false); setQuery(''); setResults([]); setManualTitle(''); setManualArtist('');
        onChange();
      } else {
        const data = await res.json().catch(() => null);
        setAddError(data?.error ?? 'Erro ao sugerir música.');
      }
    });
  }

  function setLevel(candidateId: string, level: number) {
    setPendingId(candidateId);
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${round.id}/candidates/${candidateId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level }),
      });
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

  // Qualquer pessoa pode apagar os próprios votos, completos ou não — igual
  // ao toggle por música (sempre permitido), só que a rodada inteira de
  // uma vez. Não precisa administrar o grupo: é o próprio voto de quem pede.
  function removeMyVotes() {
    if (!confirm('Excluir todos os seus votos nessa votação?')) return;
    startTransition(async () => {
      await fetch(`/api/groups/${groupId}/votes/${round.id}/mine`, { method: 'DELETE' });
      onChange();
    });
  }

  // Drag-and-drop de um SetlistCard: soltar abre o seletor, não importa
  // direto — o usuário escolhe quais músicas quer mandar pra votação.
  function handleDragOver(e: React.DragEvent) {
    if (round.status !== 'open') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (round.status !== 'open') return;
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as DraggedSetlist;
      if (!data.songs?.length) return;
      setImportSource(data);
      setSelectedSongIds(new Set(data.songs.map((s) => s.id)));
    } catch {
      // payload de outro tipo de drag — ignora
    }
  }

  function toggleSongSelected(id: string) {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function confirmImport() {
    if (!importSource) return;
    const songs = importSource.songs.filter((s) => selectedSongIds.has(s.id));
    startTransition(async () => {
      await Promise.all(songs.map((s) =>
        fetch(`/api/groups/${groupId}/votes/${round.id}/candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: s.title, artist: s.artist, body: s.body }),
        }).catch(() => {}),
      ));
      setImportSource(null);
      onChange();
    });
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border p-4 transition-colors',
        dragOver ? 'border-accent bg-accent/5' : 'border-line bg-raised',
      )}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-bg/90">
          <p className="text-sm font-semibold text-accent">Solte pra importar músicas do setlist</p>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{round.title}</p>
          <p className="text-xs text-muted">
            {round.status === 'open'
              ? 'Aberta · dê de 1 a 3 corações pra cada música'
              : 'Encerrada'}
          </p>
        </div>
        {round.status === 'open'
          ? <span className="shrink-0 rounded-md border border-accent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">🔥 Ao vivo</span>
          : <span className="shrink-0 rounded-md border border-line px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">Fechada</span>}
      </div>

      <ProgressPanel
        participants={round.participants}
        groupId={groupId}
        roundId={round.id}
        canManage={canManageThis}
        onChange={onChange}
      />

      {round.candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line py-6 text-center text-xs text-muted">
          Nenhuma música sugerida ainda — seja o primeiro!
        </p>
      ) : round.status === 'open' ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-5 text-center">
          <p className="text-sm text-ink">
            {sessionDone === 0
              ? `${sessionTotal} ${sessionTotal === 1 ? 'música' : 'músicas'} esperando sua nota.`
              : sessionDone === sessionTotal
                ? `Você avaliou todas as ${sessionTotal} músicas.`
                : `Você já avaliou ${sessionDone} de ${sessionTotal} músicas.`}
          </p>
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-accent/70 transition-all duration-500"
              style={{ width: `${sessionTotal > 0 ? (sessionDone / sessionTotal) * 100 : 0}%` }}
            />
          </div>
          <Button size="sm" onClick={() => setShowSession(true)}>
            {sessionDone === 0 ? 'Votar agora' : sessionDone === sessionTotal ? 'Revisar meus votos' : 'Continuar votação'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((c, i) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              rank={i}
              leaderVotes={leaderVotes}
              roundOpen={round.status === 'open'}
              pending={busy && pendingId === c.id}
              onSetLevel={(level) => setLevel(c.id, level)}
            />
          ))}
        </div>
      )}

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
        {canManageThis && (
          <Button size="sm" variant="outline" onClick={() => setShowInvite(true)}>
            <IconShare className="h-3.5 w-3.5" /> Convidar por link
          </Button>
        )}
        {canManageThis && round.status === 'open' && (
          <Button size="sm" variant="ghost" onClick={close} disabled={busy}>Encerrar votação</Button>
        )}
        {canManage && round.candidates.some((c) => c.votes > 0) && (
          <Button size="sm" onClick={buildSet} disabled={busy}>Criar set com o resultado</Button>
        )}
        {sessionDone > 0 && (
          <Button size="sm" variant="ghost" onClick={removeMyVotes} disabled={busy} className="text-red-400 hover:text-red-300">
            Excluir meus votos
          </Button>
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
            {query.trim().length > 1 && results.length === 0 && (
              <p className="text-[13px] text-faint">
                Não achamos essa cifra no acervo do Musilista — pode sugerir com o texto abaixo mesmo assim.
              </p>
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

      {showInvite && (
        <InviteModal groupId={groupId} round={round} onClose={() => setShowInvite(false)} />
      )}

      {showSession && (
        <VoteSessionModal round={round} groupId={groupId} onChange={onChange} onClose={() => setShowSession(false)} />
      )}

      {importSource && (
        <Modal title={`Importar de "${importSource.name}"`} onClose={() => setImportSource(null)}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">{selectedSongIds.size} de {importSource.songs.length} selecionada(s)</p>
              <button
                type="button"
                onClick={() => setSelectedSongIds(
                  selectedSongIds.size === importSource.songs.length ? new Set() : new Set(importSource.songs.map((s) => s.id)),
                )}
                className="text-xs font-medium text-accent hover:underline"
              >
                {selectedSongIds.size === importSource.songs.length ? 'Desmarcar todas' : 'Selecionar todas'}
              </button>
            </div>
            <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {importSource.songs.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={selectedSongIds.has(s.id)}
                    onChange={() => toggleSongSelected(s.id)}
                    className="h-4 w-4 shrink-0 accent-[var(--ml-accent)]"
                  />
                  <span className="truncate text-sm text-ink">{s.title}</span>
                  {s.artist && <span className="shrink-0 text-xs text-muted">{s.artist}</span>}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setImportSource(null)}>Cancelar</Button>
              <Button size="sm" disabled={selectedSongIds.size === 0 || busy} onClick={confirmImport}>
                Adicionar {selectedSongIds.size || ''} à votação
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
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        setNewTitle(''); setShowNew(false);
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
