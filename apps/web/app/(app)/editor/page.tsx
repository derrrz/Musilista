'use client';

import { SessionProvider } from 'next-auth/react';
import { EditorProvider } from '@/app/_context/EditorContext';
import { PlayerProvider } from '@/app/_context/PlayerContext';
import EditorToolbar from '@/app/_components/EditorToolbar';
import TabsBar from '@/app/_components/TabsBar';
import A4Canvas from '@/app/_components/A4Canvas';
import ChordSelector from '@/app/_components/ChordSelector';

export default function EditorPage() {
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}
