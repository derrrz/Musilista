'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { transposeChord, transposeKey, preferFlats } from '@/app/_lib/harmony';
import type { CifraBlock, CifraLine } from '@/app/_lib/cifra';
import { IconPlay, IconPause, IconCapo, IconDocument } from '@/components/ui/icons';
import { cn } from '@/components/ui/cn';
import { FavoriteButton } from './FavoriteButton';

export type SongVersionLink = { label: string; href: string; current: boolean };

const BLOCK_TYPE_LABEL: Record<string, string> = {
  intro: 'Intro', verse: 'Verso', chorus: 'Refrão', bridge: 'Ponte', solo: 'Solo', unknown: '',
};

const BLOCK_TYPE_CLASS: Record<string, string> = {
  intro: 'text-muted border-line',
  verse: 'text-verse border-verse/50',
  chorus: 'text-chorus border-chorus/50',
  bridge: 'text-bridge border-bridge/50',
  solo: 'text-solo border-solo/50',
  unknown: 'text-muted border-line',
};

// Mesma ideia do chordRow em _lib/cifra.ts, mas recalcula o valor de cada
// acorde transposto na hora de renderizar — nunca muta a cifra armazenada,
// é só uma projeção visual da sessão de leitura.
function transposedChordRow(line: CifraLine, semitones: number, flats: boolean): string {
  if (line.chords.length === 0) return '';
  const sorted = [...line.chords].sort((a, b) => a.position - b.position);
  let row = '';
  for (const c of sorted) {
    if (c.position < row.length) continue;
    const value = semitones !== 0 ? transposeChord(c.value, semitones, flats) : c.value;
    row = row.padEnd(c.position, ' ') + value;
  }
  return row;
}

const MIN_FONT = 12;
const MAX_FONT = 22;
const DEFAULT_FONT = 15;
const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_BPM = 90;
const MIN_SCROLL_SPEED = 10;
const MAX_SCROLL_SPEED = 100;
const DEFAULT_SCROLL_SPEED = 30; // px/s

function Stepper({
  label, value, onDec, onInc, decLabel = '−', incLabel = '+',
}: {
  label: string; value: React.ReactNode; onDec: () => void; onInc: () => void; decLabel?: string; incLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">{label}</span>
      <button onClick={onDec} className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-sm text-ink transition-colors hover:bg-surface">
        {decLabel}
      </button>
      <span className="min-w-10 text-center font-mono text-xs text-muted">{value}</span>
      <button onClick={onInc} className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-sm text-ink transition-colors hover:bg-surface">
        {incLabel}
      </button>
    </div>
  );
}

export function SongViewer({
  blocks,
  title,
  artist,
  artistHref,
  songKey,
  capo,
  tuning,
  songId,
  path,
  versions = [],
  initialFavorite,
  hasSession,
}: {
  blocks: CifraBlock[];
  title: string;
  artist: string;
  artistHref?: string;
  songKey: string | null;
  capo?: number;
  tuning?: string;
  songId: string;
  path: string;
  versions?: SongVersionLink[];
  initialFavorite: boolean;
  hasSession: boolean;
}) {
  // Tudo aqui é só da sessão de leitura — nada é persistido, um recarregamento
  // sempre volta pro padrão.
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [pulsing, setPulsing] = useState(false);
  const [beatOn, setBeatOn] = useState(false);
  const [autoscroll, setAutoscroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(DEFAULT_SCROLL_SPEED);

  const displayedKey = songKey && semitones !== 0 ? transposeKey(songKey, semitones) : songKey;
  const flats = preferFlats(displayedKey || songKey || '');

  // Pulso visual de metrônomo — independente de qualquer sistema de
  // sincronização com áudio, só um intervalo local baseado no BPM escolhido.
  useEffect(() => {
    if (!pulsing) { setBeatOn(false); return; }
    const halfBeatMs = 30000 / bpm;
    const id = setInterval(() => setBeatOn((b) => !b), halfBeatMs);
    return () => clearInterval(id);
  }, [pulsing, bpm]);

  // Rolagem automática — novo, não existe em nenhum outro lugar do app.
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  useEffect(() => {
    if (!autoscroll) { lastTsRef.current = null; return; }
    function tick(ts: number) {
      if (lastTsRef.current !== null) {
        const dt = (ts - lastTsRef.current) / 1000;
        window.scrollBy(0, scrollSpeed * dt);
      }
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [autoscroll, scrollSpeed]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-ink">{title}</h1>
            {artistHref ? (
              <Link href={artistHref} className="block truncate text-sm text-muted transition-colors hover:text-accent">
                {artist}
              </Link>
            ) : (
              <p className="truncate text-sm text-muted">{artist}</p>
            )}
          </div>
          <div className="print-hide flex shrink-0 items-center gap-2">
            <button
              onClick={() => window.print()}
              title="Imprimir cifra"
              aria-label="Imprimir cifra"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <IconDocument size={14} />
            </button>
            <FavoriteButton songId={songId} path={path} initialFavorite={initialFavorite} hasSession={hasSession} />
          </div>
        </div>
        {versions.length > 1 && (
          <nav aria-label="Versões da cifra" className="print-hide flex flex-wrap items-center gap-1.5">
            {versions.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                aria-current={v.current ? 'page' : undefined}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  v.current
                    ? 'border-[color-mix(in_oklch,var(--ml-accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--ml-accent)_15%,var(--ml-surface))] text-accent'
                    : 'border-line bg-surface text-muted hover:text-ink',
                )}
              >
                {v.label}
              </Link>
            ))}
          </nav>
        )}
        {(displayedKey || capo || tuning) && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {displayedKey && (
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono font-semibold text-accent">
                Tom {displayedKey}
              </span>
            )}
            {capo && (
              <span className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-muted">
                <IconCapo size={12} /> Capo {capo}ª casa
              </span>
            )}
            {tuning && (
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-muted">
                Afinação {tuning}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Barra de controle — só da sessão, nada aqui altera a cifra salva */}
      <div className="print-hide sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-raised/95 p-3 backdrop-blur">
        <Stepper
          label="Tom"
          value={semitones > 0 ? `+${semitones}` : semitones}
          onDec={() => setSemitones((s) => s - 1)}
          onInc={() => setSemitones((s) => s + 1)}
        />
        <Stepper
          label="Fonte"
          value={fontSize}
          onDec={() => setFontSize((f) => Math.max(MIN_FONT, f - 1))}
          onInc={() => setFontSize((f) => Math.min(MAX_FONT, f + 1))}
          decLabel="A−"
          incLabel="A+"
        />

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPulsing((p) => !p)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
              pulsing ? 'border-accent text-accent' : 'border-line text-muted hover:bg-surface',
            )}
            aria-pressed={pulsing}
            title="Pulso de metrônomo"
          >
            <span className={cn('block h-2 w-2 rounded-full bg-current transition-transform duration-100', beatOn && 'scale-150')} />
          </button>
          <button onClick={() => setBpm((b) => Math.max(MIN_BPM, b - 5))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-sm text-ink transition-colors hover:bg-surface">−</button>
          <span className="w-16 text-center font-mono text-xs text-muted">{bpm} BPM</span>
          <button onClick={() => setBpm((b) => Math.min(MAX_BPM, b + 5))} className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-sm text-ink transition-colors hover:bg-surface">+</button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoscroll((a) => !a)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
              autoscroll ? 'border-accent text-accent' : 'border-line text-muted hover:bg-surface',
            )}
            aria-pressed={autoscroll}
            title="Rolagem automática"
          >
            {autoscroll ? <IconPause size={13} /> : <IconPlay size={13} />}
          </button>
          <input
            type="range"
            min={MIN_SCROLL_SPEED}
            max={MAX_SCROLL_SPEED}
            value={scrollSpeed}
            onChange={(e) => setScrollSpeed(Number(e.target.value))}
            className="h-1 w-20 accent-[var(--ml-accent)]"
            aria-label="Velocidade de rolagem"
          />
        </div>
      </div>

      {/* Corpo da cifra */}
      <div className="flex flex-col gap-5 pb-16">
        {blocks.map((block, bi) => {
          if (block.lines.length === 0) return null;
          const typeClass = BLOCK_TYPE_CLASS[block.type] ?? BLOCK_TYPE_CLASS.unknown;
          const label = BLOCK_TYPE_LABEL[block.type];
          return (
            <div key={bi} className="print-block flex flex-col gap-1.5">
              {label && (
                <span className={cn('w-fit border-l-2 pl-2 text-[11px] font-semibold uppercase tracking-wide', typeClass)}>
                  {label}
                </span>
              )}
              <div className="overflow-x-auto rounded-lg bg-surface/60 px-3 py-2">
                <div className="font-mono leading-relaxed" style={{ fontSize }}>
                  {block.lines.map((line, li) => {
                    const row = transposedChordRow(line, semitones, flats);
                    return (
                      <div key={li} className="whitespace-pre">
                        {row && <div className="text-accent">{row}</div>}
                        <div className="text-ink">{line.text || ' '}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {blocks.length === 0 && <p className="font-sans text-muted">Cifra sem conteúdo disponível.</p>}
      </div>
    </div>
  );
}
