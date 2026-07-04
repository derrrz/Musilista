'use client';

import { useParams } from 'next/navigation';
import { PlayerProvider } from '@/app/_context/PlayerContext';
import { EditorProvider } from '@/app/_context/EditorContext';
import TabsBar from '@/app/_components/TabsBar';
import A4Canvas from '@/app/_components/A4Canvas';
import ChordSelector from '@/app/_components/ChordSelector';
import { ReviewToolbar } from './ReviewToolbar';

export default function ProposalReviewPage() {
  const { proposalId } = useParams<{ proposalId: string }>();

  return (
    <PlayerProvider>
      {/* skipPersistence: revisão não deve ler/gravar no localStorage do
          editor "de verdade" — evita misturar a proposta nas abas reais do
          admin ou sobrescrever o estado salvo dele. */}
      <EditorProvider skipPersistence>
        <div className="flex h-screen flex-col overflow-hidden">
          <ReviewToolbar proposalId={proposalId} />
          <TabsBar />
          <A4Canvas />
          <ChordSelector />
        </div>
      </EditorProvider>
    </PlayerProvider>
  );
}
