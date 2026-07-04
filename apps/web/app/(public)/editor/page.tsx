'use client';

import { EditorProvider } from '@/app/_context/EditorContext';
import { PlayerProvider } from '@/app/_context/PlayerContext';
import EditorToolbar from '@/app/_components/EditorToolbar';
import TabsBar from '@/app/_components/TabsBar';
import A4Canvas from '@/app/_components/A4Canvas';
import ChordSelector from '@/app/_components/ChordSelector';
import { MobileGate } from '@/app/_components/MobileGate';

export default function EditorPage() {
  return (
    <MobileGate featureName="O editor de cifras">
      <PlayerProvider>
        <EditorProvider>
          {/* 52px = altura da TopBar do shell */}
          <div className="flex h-[calc(100vh-52px)] flex-col overflow-hidden">
            <EditorToolbar />
            <TabsBar />
            <A4Canvas />
            <ChordSelector />
          </div>
        </EditorProvider>
      </PlayerProvider>
    </MobileGate>
  );
}
