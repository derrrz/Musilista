'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEditor } from '@/app/_context/EditorContext';
import { Button } from '@/components/ui/Button';
import { IconBack, IconCheck, IconClose } from '@/components/ui/icons';
import type { Block } from '@/app/_lib/types';

type ProposalDetail = {
  id: string;
  status: string;
  proposedAt: string;
  notes: string | null;
  content: string;
  songId: string;
  title: string;
  artist: string;
  proposerName: string | null;
  proposerEmail: string;
  canonicalContent: string | null;
};

type ParsedContent = { blocks: Block[] };

export function ReviewToolbar({ proposalId }: { proposalId: string }) {
  const { tabs, importInNewTab } = useEditor();
  const router = useRouter();
  const [proposal, setProposal] = useState<ProposalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<'approve' | 'reject' | null>(null);
  const importedRef = useRef(false);
  const proposalTabIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/proposals/${proposalId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: ProposalDetail) => setProposal(d))
      .catch(() => setError('Não foi possível carregar a proposta.'))
      .finally(() => setLoading(false));
  }, [proposalId]);

  useEffect(() => {
    if (!proposal || importedRef.current) return;
    importedRef.current = true;
    // Abre a comparação (publicada) primeiro e a proposta por último —
    // importInNewTab sempre ativa a aba recém-criada, então a proposta (o
    // que o admin precisa revisar/corrigir) fica em foco por padrão.
    if (proposal.canonicalContent) {
      try {
        const canonical = JSON.parse(proposal.canonicalContent) as ParsedContent;
        importInNewTab(canonical.blocks, `${proposal.title} (publicada)`, undefined, { readOnly: true });
      } catch { /* comparação é best-effort — segue sem ela se o JSON publicado estiver ruim */ }
    }
    try {
      const parsed = JSON.parse(proposal.content) as ParsedContent;
      proposalTabIdRef.current = importInNewTab(parsed.blocks, proposal.title, undefined, { dbSongId: proposal.songId });
    } catch {
      setError('Conteúdo da proposta inválido.');
    }
  }, [proposal, importInNewTab]);

  async function act(action: 'approve' | 'reject') {
    if (!proposal) return;
    setActing(action);
    try {
      const body: { action: 'approve' | 'reject'; content?: string } = { action };
      if (action === 'approve') {
        const proposalTab = tabs.find((t) => t.id === proposalTabIdRef.current);
        if (proposalTab) {
          // Mesmo envelope usado por saveDraft/publishDraft — o resto do
          // pipeline (comparação em canonicalContent, futuras revisões)
          // espera { blocks, syncMeta?, arrangement?, ... }, não um array solto.
          const sd = proposalTab.syncData;
          body.content = JSON.stringify({
            blocks: proposalTab.blocks,
            ...(sd ? { syncMeta: { bpm: sd.bpm, beatsPerBar: sd.beatsPerBar, offsetSeconds: sd.offsetSeconds } } : {}),
            ...(proposalTab.arrangement?.length ? { arrangement: proposalTab.arrangement } : {}),
            ...(proposalTab.chordOverrides && Object.keys(proposalTab.chordOverrides).length ? { chordOverrides: proposalTab.chordOverrides } : {}),
            ...(proposalTab.extraChords && Object.keys(proposalTab.extraChords).length ? { extraChords: proposalTab.extraChords } : {}),
            ...(proposalTab.loopMarkers && Object.keys(proposalTab.loopMarkers).length ? { loopMarkers: proposalTab.loopMarkers } : {}),
          });
        }
      }
      const res = await fetch(`/api/admin/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) router.push('/admin');
      else setError('Erro ao processar a proposta.');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink">
        <IconBack size={14} />
        Voltar
      </Link>
      <div className="mx-1 h-4 w-px bg-line" />
      {loading && <span className="font-mono text-xs text-muted">Carregando…</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
      {proposal && (
        <span className="truncate text-xs text-muted">
          Proposta de {proposal.proposerName ?? proposal.proposerEmail} · {proposal.artist} — {proposal.title}
        </span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={!proposal || !!acting} onClick={() => act('reject')}>
          <IconClose size={13} />
          Rejeitar
        </Button>
        <Button size="sm" disabled={!proposal || !!acting} onClick={() => act('approve')}>
          <IconCheck size={13} />
          Aprovar
        </Button>
      </div>
    </div>
  );
}
