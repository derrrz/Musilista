'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useEditor } from '../_context/EditorContext'
import { usePlayer } from '../_context/PlayerContext'
import { Block } from '../_lib/types'
import { useProgressionEngine } from '../_lib/useProgressionEngine'
import { useSyncClock } from '../_lib/useSyncClock'
import { buildBarCumTimes, BARS_PER_ROW } from '../_lib/arrangement'
import { SongHeader } from './BlockView'
import { IconClose } from '@/components/ui/icons'
import GuitarDiagram from './GuitarDiagram'
import ChordPickerPopover from './ChordPickerPopover'


// ─── Tuning helpers ───────────────────────────────────────────────────────────

const NAMED_TUNINGS: { label: string; value: string }[] = [
  { label: 'Meio tom abaixo',   value: 'Eb Ab Db Gb Bb Eb' },
  { label: 'Tom abaixo',        value: 'D G C F A D' },
  { label: 'Tom e meio abaixo', value: 'C# F# B E G# C#' },
  { label: 'Dois tons abaixo',  value: 'C F Bb Eb G C' },
  { label: 'Drop D',            value: 'D A D G B E' },
  { label: 'Drop C',            value: 'C G C F A D' },
  { label: 'Drop B',            value: 'B F# B E G# C#' },
  { label: 'Drop Db',           value: 'Db Ab Db Gb Bb Eb' },
  { label: 'Open G',            value: 'D G D G B D' },
  { label: 'Open D',            value: 'D A D F# A D' },
  { label: 'Open E',            value: 'E B E G# B E' },
  { label: 'Open A',            value: 'E A E A C# E' },
  { label: 'DADGAD',            value: 'D A D G A D' },
  { label: 'Double Drop D',     value: 'D A D G B D' },
]

function getTuningLabel(tuning: string): string {
  const norm = (t: string) => t.trim().toLowerCase().split(/\s+/)
  const ta = norm(tuning)
  const byNotes = NAMED_TUNINGS.find(n => {
    const tb = norm(n.value)
    return ta.length === tb.length && ta.every((tok, i) => tok === tb[i])
  })
  if (byNotes) return byNotes.label
  const lower = tuning.trim().toLowerCase()
  const byLabel = NAMED_TUNINGS.find(n => n.label.toLowerCase() === lower)
  if (byLabel) return byLabel.label
  const byPartial = NAMED_TUNINGS.find(n => lower.includes(n.label.toLowerCase()))
  if (byPartial) return byPartial.label
  return tuning
}

// ─── Chord parsing ────────────────────────────────────────────────────────────

function splitChord(value: string): [root: string, quality: string] {
  const m = value.match(/^([A-G][#b]?)(.*)$/)
  return m ? [m[1], m[2]] : [value, '']
}

// ─── Data extraction ──────────────────────────────────────────────────────────

// Alias local para compat com usos internos

// ─── Layout constants ─────────────────────────────────────────────────────────

// BARS_PER_ROW importado de arrangement.ts — deve permanecer em sincronia com useSequenceEngine
const LABEL_COL     = 36   // px — left: section label
const REPEAT_COL    = 28   // px — right: ×N badge
const BARLINE_W     = 12   // px — FIXED for every barline (single or section marker)

// Bar cell available width (A4 794px, padding 40px each side → content 714px)
const CONTENT_W     = 714
const BAR_CELL_W    = (CONTENT_W - LABEL_COL - REPEAT_COL - 5 * BARLINE_W) / BARS_PER_ROW // ≈ 147.5px

/**
 * Returns typography + spacing values that fit `maxChords` chords inside
 * a single BAR_CELL_W bar cell without overflowing.
 */
function barStyle(maxChords: number) {
  if (maxChords <= 1) return { rootSize: 34, qualitySize: 17, gap: 16, px: 16, rowH: 72 }
  if (maxChords <= 2) return { rootSize: 30, qualitySize: 15, gap: 12, px: 14, rowH: 68 }
  if (maxChords <= 3) return { rootSize: 24, qualitySize: 12, gap:  8, px: 10, rowH: 62 }
  if (maxChords <= 5) return { rootSize: 19, qualitySize: 10, gap:  5, px:  8, rowH: 54 }
  return                     { rootSize: 15, qualitySize:  8, gap:  3, px:  6, rowH: 48 }
}

// ─── Visual primitives ────────────────────────────────────────────────────────

/**
 * Vertical bar line — always BARLINE_W px wide.
 *
 * Single (double=false): thin 1.5 px gray bar, centered.
 * Section marker (double=true): thick 3.5 px dark bar, centered.
 *
 * Both use the SAME center formula → left = (BARLINE_W − barWidth) / 2
 * so the bar is always at exactly BARLINE_W/2, guaranteeing that the
 * flex-1 bar cells have identical widths on every row.
 */
function BarLine({ double = false }: { double?: boolean }) {
  const w  = double ? 3.5 : 1.5
  const bg = double ? '#27272a' : '#a1a1aa'
  return (
    <div className="self-stretch flex-shrink-0 relative" style={{ width: BARLINE_W }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: (BARLINE_W - w) / 2,
        width: w,
        background: bg,
      }} />
    </div>
  )
}

/**
 * Thin header row that shows the section letter badge + block name.
 * Rendered above the first GridRow of a section when block.name is set.
 * On hover shows a ×N chip with +/− controls when repeatCount > 1.
 */
function SectionNameRow({ label, color, name, name2, onSeek, canSeek, onChipClick, passIndex = 0, onP2Seek, isInLoop, isActive, isActiveP2 }: {
  label: string
  color: string
  name: string
  name2?: string
  onSeek?: () => void
  canSeek?: boolean
  onChipClick?: (e: React.MouseEvent<HTMLSpanElement>) => void
  passIndex?: 0 | 1
  /** Quando definido, exibe um segundo badge clicável para a 2ª passada do loop compacto. */
  onP2Seek?: () => void
  /** True quando esta seção faz parte de um loop não-consecutivo (loopBackToEntryId). */
  isInLoop?: boolean
  /** True quando a cobrinha está nesta seção (qualquer passada). */
  isActive?: boolean
  /** True quando a cobrinha está especificamente na 2ª passada (loop compacto). */
  isActiveP2?: boolean
}) {
  const isSecond = passIndex === 1
  const hasCompactLoop = !!onP2Seek
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative', paddingLeft: LABEL_COL / 2, paddingTop: isSecond ? 6 : 10, paddingBottom: 3, cursor: canSeek ? 'pointer' : 'default', opacity: isActive ? 1 : 0.55, transition: 'opacity 0.3s' }}
      onClick={canSeek ? onSeek : undefined}
      title={canSeek ? 'Ir para este trecho' : undefined}
      role={canSeek ? 'button' : undefined}
    >
      {/* Badge do bloco (A, B, C…) — sempre único, abre chip menu */}
      <span
        className="font-bold rounded leading-none flex-shrink-0 inline-flex items-center gap-0.5"
        style={{
          fontSize: 11,
          padding: '2px 5px',
          background: isSecond ? color + '10' : color + '18',
          color: isSecond ? color + 'bb' : color,
          border: `1.5px solid ${isSecond ? color + '55' : color}`,
          fontFamily: 'system-ui, sans-serif',
          cursor: onChipClick ? 'pointer' : 'default',
        }}
        onClick={e => { e.stopPropagation(); onChipClick?.(e) }}
      >
        {label}
        {isSecond && <span style={{ fontSize: 8, lineHeight: 1, marginLeft: 1 }}>↩</span>}
        {hasCompactLoop && <span style={{ fontSize: 7, lineHeight: 1, marginLeft: 1, fontWeight: 700, opacity: 0.75 }}>×2</span>}
      </span>

      {/* Nome do bloco — duplicado em loop compacto, simples nos demais casos */}
      {hasCompactLoop ? (
        <>
          {/* 1ª passada */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: isActive && isActiveP2 ? 0.55 : 1, transition: 'opacity 0.3s' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                color: '#52525b',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.01em',
                cursor: canSeek ? 'pointer' : 'default',
              }}
              onClick={e => { e.stopPropagation(); onSeek?.() }}
              title="1ª passada"
            >
              {name || label}
            </span>
            {canSeek && (
              <span
                style={{ fontSize: 10, color: color + '99', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onSeek?.() }}
                title="Ir para 1ª passada"
              >▶</span>
            )}
          </span>
          {/* 2ª passada */}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: isActive && !isActiveP2 ? 0.55 : 1, transition: 'opacity 0.3s' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1,
                color: '#52525b',
                fontFamily: 'system-ui, sans-serif',
                letterSpacing: '0.01em',
                cursor: 'pointer',
              }}
              onClick={e => { e.stopPropagation(); onP2Seek!() }}
              title="2ª passada"
            >
              {(name2 ?? name) || label}
            </span>
            <span
              style={{ fontSize: 10, color: color + '99', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onP2Seek!() }}
              title="Ir para 2ª passada"
            >▶</span>
          </span>
        </>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1,
              color: '#52525b',
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.01em',
              cursor: canSeek ? 'pointer' : 'inherit',
            }}
            onClick={canSeek ? e => { e.stopPropagation(); onSeek?.() } : undefined}
          >
            {name}
            {isSecond && <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 4, color: '#a1a1aa' }}>2ª passada</span>}
          </span>
          {canSeek && (
            <span
              style={{ fontSize: 10, color: color + (isSecond ? '66' : '99'), display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}
              onClick={e => { e.stopPropagation(); onSeek?.() }}
              title="Ir para este trecho"
            >▶</span>
          )}
        </span>
      )}
    </div>
  )
}

/**
 * Unified grid row.
 * Structure: [LABEL_COL] [‖?] [slot0] [|] [slot1] [|] [slot2] [|] [slot3] [‖?] [REPEAT_COL]
 *
 * When repeatCount > 1 and showRepeat is true, a ×N badge appears in the right column.
 */
type BarStyle = ReturnType<typeof barStyle>
type MergedCell = string[][]  // outer = sub-bars, inner = acordes do bar

type DragProps = {
  barKeys: (string | null)[]
  // Override (lista final de acordes) por col, quando definido substitui a exibição
  overridesPerCol: Record<number, string[] | undefined>
  dragOverKey: string | null
  dragOverIndex: number | null
  isDraggingChord: boolean
  onChordDragStart: (barKey: string, srcIndex: number) => void
  onChordDragEnd: () => void
  onSlotDragOver: (key: string, insertIndex: number) => void
  onSlotDrop: (key: string, insertIndex: number) => void
  onChordClick?: (barKey: string, ci: number, chord: string, rect: DOMRect) => void
  onChordMouseDown?: (e: React.MouseEvent, barKey: string, ci: number, chord: string, rect: DOMRect) => void
}

function GridRow({
  label, color, showLabel,
  openDouble, closeDouble,
  slots,
  bs,
  chordColor,
  // loop props
  hoveredBarCol,
  onBarEnter,
  onBarLeave,
  onBarClick,
  loopEndCol,
  loopCount,
  loopZone,
  onLoopCountChange,
  extBadge,

  extraChordsPerCol,
  onBarBottomClick,
  onSeekSection,
  canSeek,
  dragProps,
  barNumbers,
  activeBarKey,
  beatPulse,
  showBeatDot,
  showSolidFill = true,
  visibleSlots = BARS_PER_ROW,
  cellTimeSigs,
  showDiagrams = false,
}: {
  label: string
  color: string
  showLabel: boolean
  openDouble: boolean
  closeDouble: boolean
  slots: (MergedCell | null)[]
  bs: BarStyle
  chordColor: string
  hoveredBarCol?: number | null
  onBarEnter?: (col: number) => void
  onBarLeave?: () => void
  onBarClick?: (col: number) => void
  loopEndCol?: number | null
  loopCount?: number
  loopZone?: boolean
  onLoopCountChange?: (delta: number) => void
  extBadge?: { count: number; color: string; onInc?: () => void; onDec?: () => void }

  extraChordsPerCol?: Record<number, string[]>
  onBarBottomClick?: (col: number, rect: DOMRect) => void
  onSeekSection?: () => void
  canSeek?: boolean
  dragProps?: DragProps
  barNumbers?: Record<number, number>
  activeBarKey?: string | null
  beatPulse?: { key: string; bpm: number; beatsPerBar: number; elapsedMs: number } | null
  showBeatDot?: boolean
  showSolidFill?: boolean
  visibleSlots?: number
  /** Fórmula de compasso efetiva por coluna. isChange=true quando este compasso define a mudança. */
  cellTimeSigs?: Record<number, { num: number; den: number; isChange: boolean }>
  showDiagrams?: boolean
}) {
  const [zoneHover, setZoneHover] = useState<{ bi: number; zone: 'top' | 'bottom' } | null>(null)
  const truncated = visibleSlots < BARS_PER_ROW
  return (
    <div className="flex items-stretch relative">

      {/* ── Label column ── */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: LABEL_COL }}
      >
        {showLabel && (
          <span
            className="font-bold rounded leading-none"
            style={{
              fontSize: 11,
              padding: '2px 5px',
              background: color + '18',
              color,
              border: `1.5px solid ${color}`,
              fontFamily: 'system-ui, sans-serif',
              cursor: canSeek ? 'pointer' : 'default',
            }}
            onClick={canSeek ? onSeekSection : undefined}
            title={canSeek ? 'Ir para este trecho' : undefined}
          >
            {label}
          </span>
        )}
      </div>

      {/* ── Bars area ──
           Strategy: borderBottom on every non-truncated row acts as separator for the row below.
           borderTop only on the first row of each section (openDouble).
           Truncated rows use abs divs so borders never extend past visible bars. ── */}
      <div
        className="relative flex flex-1 items-stretch"
        style={{
          borderTop: (openDouble && !truncated) ? '1.5px solid #a1a1aa' : 'none',
          borderBottom: !truncated ? '1.5px solid #a1a1aa' : 'none',
        }}
      >
        {/* Narrow top border for a truncated first-row (avoids phantom extension) */}
        {openDouble && truncated && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: BARLINE_W + visibleSlots * (BAR_CELL_W + BARLINE_W),
            height: 1.5,
            background: '#a1a1aa',
            pointerEvents: 'none',
          }} />
        )}
        {/* Narrow bottom border for truncated close-double row */}
        {closeDouble && truncated && (
          <div style={{
            position: 'absolute',
            bottom: -1,
            left: 0,
            width: BARLINE_W + visibleSlots * (BAR_CELL_W + BARLINE_W),
            height: 1.5,
            background: '#a1a1aa',
            pointerEvents: 'none',
          }} />
        )}
        <BarLine double={openDouble} />

        {Array.from({ length: visibleSlots }, (_, bi) => {
          const barKey = dragProps?.barKeys[bi] ?? null
          const isDragTarget = barKey !== null && dragProps?.dragOverKey === barKey
          const overrideList = dragProps?.overridesPerCol[bi]
          // Lista unificada para drag: usa override quando presente; senão originais (achatados) + extras
          const flatOriginal: string[] = (slots[bi] ?? []).flat()
          const extras: string[] = extraChordsPerCol?.[bi] ?? []
          const dragChords: string[] = overrideList ?? [...flatOriginal, ...extras]
          const isDraggingChord = !!dragProps?.isDraggingChord
          const isActive = activeBarKey !== null && barKey === activeBarKey

          return (
          <div key={bi} className="contents">
            <div
              className="flex items-center min-w-0 overflow-hidden relative"
              data-bar-id={barNumbers?.[bi] ?? undefined}
              data-bar-key={barKey ?? undefined}
              onMouseEnter={slots[bi] && onBarEnter ? () => onBarEnter(bi) : undefined}
              onMouseLeave={() => { onBarLeave?.(); setZoneHover(null) }}
              onMouseMove={!isDraggingChord ? e => {
                const isTopRight = e.nativeEvent.offsetY / e.currentTarget.offsetHeight < 0.35
                  && e.nativeEvent.offsetX / e.currentTarget.offsetWidth > 0.55
                const zone = isTopRight ? 'top' : 'bottom'
                setZoneHover(prev => (prev?.bi === bi && prev.zone === zone) ? prev : { bi, zone })
                e.currentTarget.style.cursor = (isTopRight && dragChords.length > 0 && loopEndCol !== bi)
                  ? 'default'
                  : 'pointer'
              } : undefined}
              onClick={!isDraggingChord ? e => {
                const isTopRight = e.nativeEvent.offsetY / e.currentTarget.offsetHeight < 0.35
                  && e.nativeEvent.offsetX / e.currentTarget.offsetWidth > 0.55
                if (isTopRight && dragChords.length > 0) {
                  onBarClick?.(bi)
                } else {
                  e.stopPropagation()
                  onBarBottomClick?.(bi, e.currentTarget.getBoundingClientRect())
                }
              } : undefined}
              style={{
                flex: visibleSlots < BARS_PER_ROW ? 'none' : '1',
                width: visibleSlots < BARS_PER_ROW ? BAR_CELL_W : undefined,
                minHeight: bs.rowH,
                gap: bs.gap,
                paddingLeft: bs.px,
                paddingRight: bs.px,
                cursor: 'default',
                background: isActive && !beatPulse && showSolidFill ? 'rgba(99,102,241,0.12)' : isDragTarget ? 'rgba(99,102,241,0.18)' : 'transparent',
                transition: 'background 0.15s',
                borderRight: loopEndCol === bi ? '2px solid #16a34a' : undefined,
                outline: isDragTarget ? '1.5px dashed #6366f1' : undefined,
                outlineOffset: -2,
              }}
            >
              {/* Pulsador — segmentos estilo cobra, um por tempo da fórmula de compasso */}
              {isActive && beatPulse && (() => {
                const colonIdx   = beatPulse.key.lastIndexOf(':')
                const barKey     = beatPulse.key.slice(0, colonIdx)
                const beatIdx    = Math.min(parseInt(beatPulse.key.slice(colonIdx + 1), 10), beatPulse.beatsPerBar - 1)
                const bpb        = beatPulse.beatsPerBar
                return (
                  <div
                    key={barKey}
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: '3px 3px',
                      display: 'flex',
                      gap: 2,
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  >
                    {Array.from({ length: bpb }, (_, i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          borderRadius: 3,
                          background: i <= beatIdx ? 'rgba(99,102,241,0.22)' : 'transparent',
                          transition: 'background 55ms ease-in',
                        }}
                      />
                    ))}
                  </div>
                )
              })()}
              {/* Número de ordem do compasso preenchido */}
              {barNumbers?.[bi] !== undefined && (
                <span style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 4,
                  fontSize: 8,
                  lineHeight: 1,
                  color: '#a1a1aa',
                  pointerEvents: 'none',
                  fontFamily: 'system-ui, sans-serif',
                  fontVariantNumeric: 'tabular-nums',
                  userSelect: 'none',
                }}>
                  {barNumbers[bi]}
                </span>
              )}

              {/* Fórmula de compasso efetiva do bar — aparece quando diferente da global */}
              {cellTimeSigs?.[bi] && (
                <div
                  title={cellTimeSigs[bi].isChange ? 'Muda aqui — clique para editar' : 'Fórmula ativa — clique para editar'}
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 9,
                    lineHeight: 1.1,
                    color: cellTimeSigs[bi].isChange ? '#7c3aed' : '#a1a1aa',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    opacity: 0.85,
                  }}
                >
                  <span>{cellTimeSigs[bi].num}</span>
                  <span style={{ borderTop: `1px solid ${cellTimeSigs[bi].isChange ? '#7c3aed' : '#a1a1aa'}`, width: '100%', display: 'block', margin: '1px 0' }} />
                  <span>{cellTimeSigs[bi].den}</span>
                </div>
              )}

              {/* Chords — lista unificada (com override quando definido) */}
              {dragChords.map((chord, ci) => {
                const [root, quality] = splitChord(chord)
                const showLeftIndicator = barKey !== null && dragProps?.dragOverKey === barKey && dragProps?.dragOverIndex === ci
                return (
                  <div
                    key={ci}
                    className={showDiagrams ? undefined : 'contents'}
                    style={showDiagrams ? {
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      flexShrink: 0,
                    } : undefined}
                  >
                    {/* Drop indicator (linha vertical) entre acordes */}
                    {showLeftIndicator && (
                      <div style={{
                        width: 2,
                        alignSelf: 'stretch',
                        background: '#6366f1',
                        flexShrink: 0,
                        margin: '4px 0',
                        borderRadius: 2,
                      }} />
                    )}
                    <span
                      className="inline-flex items-baseline leading-none flex-shrink-0"
                      data-chord-idx={ci}
                      onMouseDown={barKey && dragProps?.onChordMouseDown ? e => {
                        e.stopPropagation()
                        dragProps.onChordMouseDown!(e, barKey, ci, chord, (e.currentTarget as HTMLElement).getBoundingClientRect())
                      } : undefined}
                      style={{ cursor: barKey ? 'grab' : 'default' }}
                    >
                      <span style={{
                        fontSize: bs.rootSize,
                        fontWeight: 800,
                        color: chordColor,
                        lineHeight: 1.15,
                        fontFamily: 'system-ui, sans-serif',
                        userSelect: 'none',
                      }}>
                        {root}
                      </span>
                      {quality && (
                        <span style={{
                          fontSize: bs.qualitySize,
                          fontWeight: 600,
                          color: chordColor,
                          lineHeight: 1,
                          fontFamily: 'system-ui, sans-serif',
                          marginBottom: 2,
                          userSelect: 'none',
                        }}>
                          {quality}
                        </span>
                      )}
                    </span>
                    {showDiagrams && <GuitarDiagram chord={chord} />}
                  </div>
                )
              })}
              {/* Drop indicator no fim do bar */}
              {barKey !== null && dragProps?.dragOverKey === barKey && dragProps?.dragOverIndex === dragChords.length && dragChords.length > 0 && (
                <div style={{
                  width: 2,
                  alignSelf: 'stretch',
                  background: '#6366f1',
                  flexShrink: 0,
                  margin: '4px 0',
                  borderRadius: 2,
                }} />
              )}
              {/* Botão inline de adicionar acorde */}
              {barKey !== null && onBarBottomClick && !isDraggingChord && zoneHover?.bi === bi && zoneHover.zone !== 'top' && (
                <button
                  className="text-zinc-300 hover:text-indigo-400 transition-colors"
                  style={{ fontSize: 14, background: 'transparent', cursor: 'pointer', lineHeight: 1, paddingLeft: 4, flexShrink: 0, userSelect: 'none' }}
                  onClick={e => {
                    e.stopPropagation()
                    const cell = e.currentTarget.closest('[data-bar-key]') as HTMLElement | null
                    onBarBottomClick(bi, cell?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect())
                  }}
                >+</button>
              )}

              {/* Hatching strip — thin top band over loop zone bars */}
              {(loopZone && (loopEndCol == null || bi <= loopEndCol) || loopEndCol === bi) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 7,
                    pointerEvents: 'none',
                    background: 'repeating-linear-gradient(-45deg, rgba(74,222,128,0.55) 0px, rgba(74,222,128,0.55) 3px, transparent 3px, transparent 7px)',
                  }}
                />
              )}

              {/* Zone hover hints */}
              {zoneHover?.bi === bi && dragChords.length > 0 && loopEndCol !== bi && zoneHover.zone === 'top' && (
                <div style={{ position: 'absolute', top: 3, right: 5, fontSize: 17, color: '#16a34a', opacity: 0.8, pointerEvents: 'none', fontFamily: 'system-ui, sans-serif', lineHeight: 1 }}>⟳</div>
              )}

              {/* Nx badge — inside the endpoint bar, top-right */}
              {loopEndCol === bi && loopCount !== undefined && (
                <div
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    zIndex: 10,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {onLoopCountChange && (
                    <button
                      onClick={() => onLoopCountChange(-1)}
                      disabled={loopCount <= 1}
                      style={{ fontSize: 9, lineHeight: 1, color: loopCount <= 1 ? '#86efac' : '#166534', background: 'transparent', cursor: loopCount <= 1 ? 'default' : 'pointer', padding: '0 1px' }}
                    >−</button>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#166534', fontFamily: 'system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{loopCount}x</span>
                  {onLoopCountChange && (
                    <>
                      <button
                        onClick={() => onLoopCountChange(1)}
                        style={{ fontSize: 9, lineHeight: 1, color: '#166534', background: 'transparent', cursor: 'pointer', padding: '0 1px' }}
                      >+</button>
                      <button
                        onClick={() => onBarClick?.(-1)}
                        style={{ display: 'flex', color: '#86efac', background: 'transparent', cursor: 'pointer', padding: '0 1px', marginLeft: 1 }}
                      ><IconClose size={8} /></button>
                    </>
                  )}
                </div>
              )}


            </div>
            <BarLine double={bi === visibleSlots - 1 && closeDouble} />
          </div>
          )
        })}


      </div>

      {/* ── Repeat column — external badges (×N repeat) ── */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5"
        style={{
          width: REPEAT_COL,
          ...(truncated ? {
            position: 'absolute',
            left: LABEL_COL + BARLINE_W + visibleSlots * (BAR_CELL_W + BARLINE_W),
            top: 0,
            bottom: 0,
          } : {}),
        }}
      >
        {extBadge && (
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, fontFamily: 'system-ui, sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            {extBadge.onInc && (
              <button
                onClick={extBadge.onInc}
                style={{ fontSize: 9, lineHeight: 1, color: extBadge.color, background: 'transparent', cursor: 'pointer', padding: '1px 2px' }}
              >+</button>
            )}
            <span style={{ fontSize: 11, fontWeight: 800, color: extBadge.color, minWidth: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
              ×{extBadge.count}
            </span>
            {extBadge.onDec && (
              <button
                onClick={extBadge.onDec}
                disabled={extBadge.count <= 1}
                style={{ fontSize: 9, lineHeight: 1, color: extBadge.count <= 1 ? extBadge.color + '44' : extBadge.color, background: 'transparent', cursor: extBadge.count <= 1 ? 'default' : 'pointer', padding: '1px 2px' }}
              >−</button>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type ChordPickerState = {
  key: string
  anchorX: number
  lineTop: number
  lineBottom: number
  initialValue?: string
}

export default function ChordChartView({ zoom }: { zoom: number }) {
  const { activeTab, activeTabId, chordColor, setArrangement, deleteAddedRow, setChordOverride, seekToBar, showBeatDot, addBlock, duplicateBlock, splitBlock, setLoopMarker, nowPlayingTitle, nowPlayingIsPlaying, updateBlock, removeBlock, blockGap, setSyncData, animPrefs } = useEditor()
  const engine = useProgressionEngine()
  const { effectiveArr, sections: grouped, filledBarIndex, sectionFirstBars,
          sequence, timings, devTimings, practiceLoops,
          chordOverrides, extraChords, loopMarkers, getDisplayChords,
          moveChord,
          showDiagrams, setShowDiagrams } = engine
  const { bpm: playerBpm } = usePlayer()
  // showDiagrams comes from engine (shared state)

  // ── Fórmula de compasso (chip inicial da grade) ─────────────────────────────
  const tsNum = activeTab?.syncData?.beatsPerBar ?? 4
  const tsDen = activeTab?.syncData?.beatValue   ?? 4
  const [editingTs, setEditingTs] = useState(false)
  const tsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!editingTs) return
    function onDown(e: MouseEvent) {
      if (tsRef.current && !tsRef.current.contains(e.target as Node)) setEditingTs(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [editingTs])
  function saveTs(num: number, den: number) {
    if (!activeTabId) return
    const existing = activeTab?.syncData
    setSyncData(activeTabId, existing
      ? { ...existing, beatsPerBar: num, beatValue: den }
      : { bpm: 120, beatsPerBar: num, beatValue: den, offsetSeconds: 0 }
    )
    setEditingTs(false)
  }

  const [chipMenu, setChipMenu] = useState<{
    entryId: string
    blockId: string
    name: string
    customLabel: string
    hideEmptyBars: boolean
    loopBackToEntryId: string | undefined
    groupProgressions: boolean
    isCompact: boolean
    mirrorName: string
    anchor: { x: number; y: number }
  } | null>(null)
  const chipMenuRef = useRef<HTMLDivElement>(null)

  const [addMenu, setAddMenu] = useState<{ entryId: string; blockId: string; anchor: { x: number; y: number }; onAddRow: () => void } | null>(null)
  const addMenuRef = useRef<HTMLDivElement>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{ anchor: { x: number; y: number }; onDelete: () => void } | null>(null)
  const deleteConfirmRef = useRef<HTMLDivElement>(null)

  const [hoveredBar, setHoveredBar] = useState<{ gi: number; ri: number; col: number } | null>(null)
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null)
  const rowHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hoveredSplitKey, setHoveredSplitKey] = useState<string | null>(null)
  const [chordPickerState, setChordPickerState] = useState<ChordPickerState | null>(null)
  const [chordDeletePopup, setChordDeletePopup] = useState<{
    barKey: string; ci: number; chord: string; x: number; y: number
  } | null>(null)

  // ── Chord drag-and-drop ───────────────────────────────────────────────────
  type DragSrc = { barKey: string; srcIndex: number }
  const [dragSrc, setDragSrc] = useState<DragSrc | null>(null)
  const [dragOver, setDragOver] = useState<{ key: string; index: number } | null>(null)
  const [dragOverGhost, setDragOverGhost] = useState<{ entryId: string; type: 'right' | 'below' } | null>(null)

  // ── Pulsador — relógio RAF isolado em useSyncClock ───────────────────────
  // isSynced: só ativa o clock quando a música tocando corresponde a esta aba
  const normalize = (s: string) => s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
  const isSynced = !!nowPlayingTitle && !!activeTab && nowPlayingIsPlaying &&
    normalize(activeTab.name) === normalize(nowPlayingTitle)

  function commitChipMenu() {
    if (!chipMenu) return
    const block = activeTab?.blocks.find(b => b.id === chipMenu.blockId)
    if (block && chipMenu.name.trim() !== block.name) {
      updateBlock(activeTabId, { ...block, name: chipMenu.name.trim() })
    }
    const entry = effectiveArr.find(e => e.id === chipMenu.entryId)
    const trimmedLabel = chipMenu.customLabel.trim()
    const trimmedMirror = chipMenu.mirrorName.trim()
    if (entry) {
      const labelChanged  = trimmedLabel  !== (entry.customLabel  ?? '')
      const gpChanged     = chipMenu.groupProgressions !== (entry.groupProgressions ?? false)
      const mirrorChanged = chipMenu.isCompact && trimmedMirror !== (entry.mirrorName ?? '')
      if (labelChanged || gpChanged || mirrorChanged) {
        const next = effectiveArr.map(en =>
          en.id === chipMenu.entryId
            ? {
                ...en,
                customLabel:       trimmedLabel  || undefined,
                groupProgressions: chipMenu.groupProgressions || undefined,
                mirrorName:        chipMenu.isCompact ? (trimmedMirror || undefined) : undefined,
              }
            : en
        )
        setArrangement(activeTabId, next)
      }
    }
    setChipMenu(null)
  }

  useEffect(() => {
    if (!chipMenu) return
    function onMouseDown(e: MouseEvent) {
      if (chipMenuRef.current && !chipMenuRef.current.contains(e.target as Node)) {
        commitChipMenu()
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [chipMenu]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!addMenu) return
    function onMouseDown(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenu(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [addMenu])

  useEffect(() => {
    if (!deleteConfirm) return
    function onMouseDown(e: MouseEvent) {
      if (deleteConfirmRef.current && !deleteConfirmRef.current.contains(e.target as Node)) {
        setDeleteConfirm(null)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [deleteConfirm])


  useEffect(() => {
    if (!chordPickerState) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChordPickerState(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chordPickerState])

  useEffect(() => {
    if (!chordDeletePopup) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChordDeletePopup(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [chordDeletePopup])

  // Tempos cumulativos de bar — usa playerBpm como fonte única de BPM
  const sd = activeTab?.syncData
  const barCumTimes = useMemo(() =>
    buildBarCumTimes(
      sequence,
      sd?.timeSigChanges,
      playerBpm,
      sd?.beatsPerBar ?? 4,
      sd?.beatValue ?? 4,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sequence, sd?.timeSigChanges, playerBpm, sd?.beatsPerBar, sd?.beatValue],
  )

  // Relógio RAF — separado da renderização para sobreviver a reestruturações do componente
  // No modo DEV (forceSynced), usa devTimings (índices sequenciais) para que a cobrinha
  // siga os chips exatamente, independente de células vazias ou barsPerCell.
  const isDevMode = !!sd?.forceSynced
  const { activeBarKey: rawActiveBarKey, beatPulse, activeBarProgressRef } = useSyncClock(
    isDevMode ? devTimings : timings,
    activeTab?.syncData,
    isSynced,
    isDevMode ? [] : practiceLoops,
    isDevMode ? null : barCumTimes,
    isDevMode ? undefined : sd?.timeSigChanges,
  )

  // Animações: barra (gradiente RAF), cobrinha (beatPulse), sólido (fundo fixo)
  const showBarraRef = useRef(true)
  showBarraRef.current = animPrefs.barra

  // Cobrinha na folha: gradiente no cell ativo via DOM direto (sem re-render por frame)
  const activeBarKeyRef    = useRef<string | null>(null)
  const lastActiveBarElRef = useRef<HTMLElement | null>(null)
  const chartRootRef       = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let rafId: number
    const tick = () => {
      const key      = activeBarKeyRef.current
      const progress = activeBarProgressRef.current
      const root     = chartRootRef.current

      if (key && root) {
        const safeKey = key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const el = root.querySelector<HTMLElement>(`[data-bar-key="${safeKey}"]`)
        if (el !== lastActiveBarElRef.current) {
          if (lastActiveBarElRef.current) lastActiveBarElRef.current.style.background = ''
          lastActiveBarElRef.current = el ?? null
        }
        if (el) {
          if (showBarraRef.current) {
            const pct = Math.round(progress * 100)
            el.style.background =
              `linear-gradient(to right, rgba(99,102,241,0.55) ${pct}%, rgba(99,102,241,0.08) ${pct}%)`
          } else {
            el.style.background = ''
          }
        }
      } else if (lastActiveBarElRef.current) {
        lastActiveBarElRef.current.style.background = ''
        lastActiveBarElRef.current = null
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-delete added rows that become completely empty after a chord is removed.
  // Deps: only chord data — intentionally excludes `arrangement` so that adding a new
  // empty row via addRow() doesn't immediately trigger its own deletion.
  useEffect(() => {
    if (!activeTab || dragSrc) return
    const chordOvs  = activeTab.chordOverrides ?? {}
    const extChords = activeTab.extraChords    ?? {}

    for (const s of engine.sections) {
      const baseCells = s.cells.length
      const addedCells = s.addedCells
      if (addedCells <= 0) continue

      // Work from the last added row downward; stop at the first non-empty row
      const totalCells = baseCells + addedCells
      const lastAddedRowStart = Math.ceil(baseCells / BARS_PER_ROW) * BARS_PER_ROW

      for (let rowStart = totalCells - BARS_PER_ROW; rowStart >= lastAddedRowStart; rowStart -= BARS_PER_ROW) {
        const rowEnd = rowStart + BARS_PER_ROW - 1
        let hasChords = false
        for (let ci = rowStart; ci <= rowEnd; ci++) {
          const k = `${s.entryId}:${ci}`
          const ov = chordOvs[k]
          const ex = extChords[k]
          if ((ov !== undefined && ov.length > 0) || (ex !== undefined && ex.length > 0)) {
            hasChords = true
            break
          }
        }
        if (hasChords) break // row has content — stop scanning this section
        deleteAddedRow(activeTabId, s.entryId, rowStart, rowEnd, BARS_PER_ROW)
        break // deleteAddedRow is async (setTabs); re-runs of this effect handle further rows
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.chordOverrides, activeTab?.extraChords, activeTabId, dragSrc])

  // Limpa entradas órfãs do arrangement: blocos sem bars originais e sem addedCells
  // (criados via + grupo e esvaziados via ×). Roda separado do auto-delete para que
  // addRow() não seja cancelado pela limpeza de linhas vazias.
  useEffect(() => {
    if (!activeTab) return
    const arr = engine.effectiveArr
    const orphanIds = arr
      .filter(e => {
        const block = activeTab.blocks.find(b => b.id === e.blockId)
        if (!block) return true // block foi removido
        const hasOrigBars = block.sections.some(
          s => (s.type === 'LYRICS_CHORDS' || s.type === 'CHORDS_ONLY') && s.lines.some(l => l.chords.length > 0)
        )
        return !hasOrigBars && !(e.addedCells ?? 0)
      })
      .map(e => e.id)
    if (orphanIds.length > 0) {
      const cleaned = arr.filter(e => !orphanIds.includes(e.id))
      setArrangement(activeTabId, cleaned.length ? cleaned : undefined!)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.arrangement, activeTabId])

  if (!activeTab) return null

const sorted      = activeTab.blocks.slice().sort((a, b) => a.order - b.order)
  const headerBlock = sorted.find(b => b.type === 'header')

  const headerLines = headerBlock?.sections[0]?.lines ?? []
  const songTitle   = headerLines[0]?.text.trim() || activeTab.name
  const artist      = headerLines[1]?.text.trim() || ''

  // Entradas p1 cujos espelhos (p2) devem ser ocultados (groupProgressions=true)
  const compactRangeIds = new Set<string>()
  for (const en of effectiveArr) {
    if (!en.loopBackToEntryId || !en.groupProgressions) continue
    const targetIdx = effectiveArr.findIndex(e => e.id === en.loopBackToEntryId)
    const triggerIdx = effectiveArr.findIndex(e => e.id === en.id)
    if (targetIdx < 0 || triggerIdx < 0) continue
    for (let i = targetIdx; i <= triggerIdx; i++) compactRangeIds.add(effectiveArr[i].id)
  }

  // IDs de todos os entries participantes de qualquer loop não-consecutivo
  // (trigger + target + intermediários) — usados para exibir ↻ no label
  const loopParticipantIds = new Set<string>()
  for (const en of effectiveArr) {
    if (!en.loopBackToEntryId) continue
    const targetIdx  = effectiveArr.findIndex(e => e.id === en.loopBackToEntryId)
    const triggerIdx = effectiveArr.findIndex(e => e.id === en.id)
    if (targetIdx < 0 || triggerIdx < 0) continue
    for (let i = targetIdx; i <= triggerIdx; i++) loopParticipantIds.add(effectiveArr[i].id)
  }

  // Quando uma chave p2 está ativa mas a seção espelho está oculta (groupProgressions),
  // remapeia para a chave p1 equivalente para que a célula p1 acenda no pulsador.
  const activeBarKey = (() => {
    if (!rawActiveBarKey) return rawActiveBarKey
    const p2Match = rawActiveBarKey.match(/^(.+)-p2:(\d+)$/)
    if (!p2Match) return rawActiveBarKey
    const [, baseId, ci] = p2Match
    return compactRangeIds.has(baseId) ? `${baseId}:${ci}` : rawActiveBarKey
  })()

  // Mantém ref sincronizado com o activeBarKey para o RAF da cobrinha
  activeBarKeyRef.current = activeBarKey ?? null

  // Global bar style — computed from the most chord-dense merged cell across ALL sections
  const maxChordsPerBar = Math.max(
    1,
    ...grouped.flatMap(s =>
      s.cells.map(cell => cell.reduce((sum, bar) => sum + bar.length, 0))
    ),
  )
  const bs = barStyle(maxChordsPerBar)
  const DIAG_ADD_H = 68
  const bsActual = showDiagrams
    ? {
        ...bs,
        rowH: bs.rowH + DIAG_ADD_H,
        rootSize:   Math.max(bs.rootSize   - 4, 13),
        qualitySize: Math.max(bs.qualitySize - 2,  9),
      }
    : bs

  return (
    <>
    {/* ── Diagrama toggle ── */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 16, paddingBottom: 8, width: '100%' }}>
      <button
        onClick={() => setShowDiagrams(v => !v)}
        title={showDiagrams ? 'Ocultar diagramas de violão' : 'Mostrar diagramas de violão'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          padding: '4px 10px',
          borderRadius: 7,
          border: `1px solid ${showDiagrams ? '#6366f1' : '#d4d4d8'}`,
          background: showDiagrams ? '#eef2ff' : '#fff',
          color: showDiagrams ? '#4338ca' : '#71717a',
          cursor: 'pointer',
          transition: 'all 0.15s',
          userSelect: 'none',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <circle cx="17.5" cy="17.5" r="3.5"/>
        </svg>
        Diagramas
      </button>
    </div>
    <div ref={chartRootRef} style={{ zoom: zoom / 100 }} className="flex flex-col items-center w-full">
      <div
        className="bg-white shadow-2xl rounded-sm"
        style={{ width: 794, minHeight: 1123, padding: '48px 40px 64px' }}
      >

        {/* ── Song header ── */}
        {headerBlock && (
          <SongHeader block={headerBlock} tabId={activeTabId} />
        )}

        {/* ── Chord chart body ── */}
        {(() => {
          function changeRepeat(entryId: string, delta: number) {
            const next = effectiveArr.map(e =>
              e.id === entryId ? { ...e, repeatCount: Math.max(1, e.repeatCount + delta) } : e
            )
            setArrangement(activeTabId, next)
          }

          function addRow(entryId: string) {
            const next = effectiveArr.map(e =>
              e.id === entryId ? { ...e, addedCells: (e.addedCells ?? 0) + BARS_PER_ROW } : e
            )
            setArrangement(activeTabId, next)
          }

          function deleteRow(entryId: string, origRowIndex: number) {
            const entry = effectiveArr.find(e => e.id === entryId)
            if (!entry) return
            const addedCellCount = entry.addedCells ?? 0

            const sec = grouped.find(g => g.entryId === entryId)
            const mergedLen = sec ? sec.cells.length : 0
            const rowStart  = origRowIndex * BARS_PER_ROW
            const rowEnd    = rowStart + BARS_PER_ROW - 1
            // Linha é adicionada se começa além das células originais (mesmo que addedCells < BARS_PER_ROW)
            const isAddedRow = rowStart >= mergedLen && addedCellCount > 0

            if (isAddedRow) {
              // Atomic update: decrement addedCells and remap overrides in one setTabs call
              // so we always read the latest prev.chordOverrides, not a stale render snapshot.
              deleteAddedRow(activeTabId, entryId, rowStart, rowEnd, BARS_PER_ROW)
            } else {
              // Original row: mark as permanently hidden via deletedRows
              const newArr = effectiveArr.map(e => {
                if (e.id !== entryId) return e
                const deletedRows = [...(e.deletedRows ?? []), origRowIndex]
                return { ...e, deletedRows }
              })
              setArrangement(activeTabId, newArr)
            }
          }

          function applyChordMove(srcBarKey: string, srcIdx: number, destKey: string, insertIndex: number, copy = false) {
            setDragSrc(null)
            setDragOver(null)
            moveChord(srcBarKey, srcIdx, destKey, insertIndex, copy)
          }

          function handleChordDrop(destKey: string, insertIndex: number) {
            const src = dragSrc
            if (!src) return
            applyChordMove(src.barKey, src.srcIndex, destKey, insertIndex)
          }

          function handleGhostDrop(destEntryId: string, type: 'right' | 'below', destTotalCells: number) {
            const src = dragSrc
            setDragSrc(null)
            setDragOver(null)
            setDragOverGhost(null)
            if (!src) return

            const srcDisplay = getDisplayChords(src.barKey)
            if (src.srcIndex < 0 || src.srcIndex >= srcDisplay.length) return
            const movedChord = srcDisplay[src.srcIndex]

            const newSrc = srcDisplay.filter((_, i) => i !== src.srcIndex)
            setChordOverride(activeTabId, src.barKey, newSrc)

            const destEntry = effectiveArr.find(e => e.id === destEntryId)
            if (!destEntry) return
            const addedCellCount = destEntry.addedCells ?? 0

            if (type === 'right') {
              const newKey = `${destEntryId}:${destTotalCells}`
              setChordOverride(activeTabId, newKey, [movedChord])
              setArrangement(activeTabId, effectiveArr.map(e =>
                e.id === destEntryId ? { ...e, addedCells: addedCellCount + 1 } : e
              ))
            } else {
              const cellsInLast = destTotalCells === 0 ? 0 : ((destTotalCells - 1) % BARS_PER_ROW) + 1
              const pad = cellsInLast === BARS_PER_ROW ? 0 : BARS_PER_ROW - cellsInLast
              const newRowFirst = destTotalCells + pad
              const newKey = `${destEntryId}:${newRowFirst}`
              setChordOverride(activeTabId, newKey, [movedChord])
              setArrangement(activeTabId, effectiveArr.map(e =>
                e.id === destEntryId ? { ...e, addedCells: addedCellCount + pad + BARS_PER_ROW } : e
              ))
            }
          }

          const canSeek = !!activeTab?.syncData

          function handleChordMouseDown(e: React.MouseEvent, srcBarKey: string, srcIndex: number, srcChord: string, srcRect: DOMRect) {
            e.preventDefault()
            const startX = e.clientX
            const startY = e.clientY
            let dragged = false
            let isCopy  = e.metaKey || e.ctrlKey

            const overlay = document.createElement('div')
            overlay.style.cssText = `position:fixed;inset:0;z-index:99999;cursor:${isCopy ? 'copy' : 'grabbing'};user-select:none;pointer-events:auto`
            document.body.appendChild(overlay)

            function findTarget(mouseX: number, mouseY: number): { barKey: string; insertIndex: number } | null {
              overlay.style.display = 'none'
              const els = document.elementsFromPoint(mouseX, mouseY) as HTMLElement[]
              overlay.style.display = ''
              for (const el of els) {
                const key = el.dataset?.barKey
                if (key) {
                  const chordEls = Array.from(el.querySelectorAll<HTMLElement>('[data-chord-idx]'))
                  for (let i = 0; i < chordEls.length; i++) {
                    const rect = chordEls[i].getBoundingClientRect()
                    if (mouseX < rect.left + rect.width / 2) return { barKey: key, insertIndex: i }
                  }
                  return { barKey: key, insertIndex: chordEls.length }
                }
              }
              return null
            }

            function onMouseMove(ev: MouseEvent) {
              // Atualiza modo cópia e cursor em tempo real
              isCopy = ev.metaKey || ev.ctrlKey
              overlay.style.cursor = isCopy ? 'copy' : 'grabbing'

              if (!dragged && Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return
              if (!dragged) {
                dragged = true
                setDragSrc({ barKey: srcBarKey, srcIndex })
              }
              const target = findTarget(ev.clientX, ev.clientY)
              if (target) setDragOver({ key: target.barKey, index: target.insertIndex })
              else setDragOver(null)
            }

            function onMouseUp(ev: MouseEvent) {
              document.body.removeChild(overlay)
              window.removeEventListener('mousemove', onMouseMove)
              window.removeEventListener('mouseup', onMouseUp)
              if (dragged) {
                const copy   = ev.metaKey || ev.ctrlKey
                const target = findTarget(ev.clientX, ev.clientY)
                if (target) applyChordMove(srcBarKey, srcIndex, target.barKey, target.insertIndex, copy)
                else { setDragSrc(null); setDragOver(null) }
              } else {
                // Clique sem drag → abre popup de exclusão
                setDragSrc(null)
                setChordDeletePopup({
                  barKey: srcBarKey,
                  ci: srcIndex,
                  chord: srcChord,
                  x: srcRect.left + srcRect.width / 2,
                  y: srcRect.bottom + 6,
                })
              }
            }

            window.addEventListener('mousemove', onMouseMove)
            window.addEventListener('mouseup', onMouseUp)
          }

          return (
            <div className="flex flex-col" style={{ gap: blockGap }}>
              {grouped.map((s, gi) => {
                const { block, bars, cells: mergedCells, label, color, entryKey, entryId, repeatCount,
                        barsPerCell, addedCells: addedCellCount, deletedRows, hideEmptyBars, sectionStartBar,
                        effectiveTotal, passIndex, baseEntryId, loopBackToEntryId: sectionLoopBack } = s

                // Ocultar espelhos (p2) quando o loop está no modo compacto
                if (passIndex === 1 && compactRangeIds.has(baseEntryId)) return null

                // p2 (espelho): busca de overrides/extras usa o entryId da 1ª passada
                const lookupEntryId = passIndex === 1 ? baseEntryId : entryId
                const isReadOnly    = passIndex === 1

                // Loop compacto: p1 em range → exibir dual badge com seek para 2ª passada
                const compactP2FirstBar = (passIndex === 0 && compactRangeIds.has(entryId))
                  ? sectionFirstBars.get(entryId + '-p2')
                  : undefined

                // Mostra SectionNameRow para blocos nomeados, p2 nomeados, e qualquer p1 editável
                const arrEntryForName = effectiveArr.find(en => en.id === entryId)
                const isActiveSectionP1 = !!rawActiveBarKey?.startsWith(entryId + ':')
                const isActiveSectionP2 = !!rawActiveBarKey?.startsWith(entryId + '-p2:')
                const nameRowProps = (block.name || !isReadOnly)
                  ? { label, color, name: block.name, passIndex, name2: compactP2FirstBar !== undefined ? (arrEntryForName?.mirrorName ?? undefined) : undefined, isInLoop: loopParticipantIds.has(baseEntryId ?? entryId), isActive: isActiveSectionP1 || isActiveSectionP2, isActiveP2: isActiveSectionP2 }
                  : null

                // ── Section ────────────────────────────────────────────────────
                // Extend with null placeholders for user-added cells
                const allCells: (MergedCell | null)[] = [
                  ...mergedCells,
                  ...Array<null>(addedCellCount).fill(null),
                ]

                const totalCells = allCells.length
                const cellsInLastRow = totalCells === 0 ? 0 : ((totalCells - 1) % BARS_PER_ROW) + 1
                const lastRowHasRoom = cellsInLastRow < BARS_PER_ROW

                const deletedRowsSet = new Set(deletedRows)
                const rawRows: { row: (MergedCell | null)[]; origRowIndex: number }[] = []
                for (let i = 0; i < allCells.length; i += BARS_PER_ROW) {
                  const origRowIndex = Math.floor(i / BARS_PER_ROW)
                  if (deletedRowsSet.has(origRowIndex)) continue
                  const row = allCells.slice(i, i + BARS_PER_ROW)
                  const hasContent = row.some((cell, bi) => {
                    const cellIndex = origRowIndex * BARS_PER_ROW + bi
                    if (cellIndex >= mergedCells.length) return !isReadOnly  // added cell — só na 1ª passada
                    const lookupKey = `${lookupEntryId}:${cellIndex}`
                    // Linha com mudança de fórmula deve aparecer mesmo sem acordes
                    if (activeTab?.syncData?.timeSigChanges?.[lookupKey] !== undefined) return true
                    if (!cell) return false
                    if (activeTab?.chordOverrides?.[lookupKey] !== undefined) return true
                    return getDisplayChords(lookupKey).length > 0
                  })
                  if (hasContent) rawRows.push({ row, origRowIndex })
                }

                let lastFilledCellIdx = -1
                if (hideEmptyBars) {
                  for (let i = 0; i < effectiveTotal; i++) {
                    const lookupKey = `${lookupEntryId}:${i}`
                    const ov = activeTab?.chordOverrides?.[lookupKey]
                    const extras = extraChords?.[lookupKey] ?? []
                    let hasChords: boolean
                    if (i < mergedCells.length) {
                      hasChords = ov !== undefined ||
                        getDisplayChords(lookupKey).length > 0
                    } else {
                      const display = ov !== undefined ? ov : extras
                      hasChords = display.length > 0
                    }
                    if (hasChords) lastFilledCellIdx = i
                  }
                }

                // Loop marker — p2 espelha o da 1ª passada (lookupEntryId)
                const lm = (loopMarkers[lookupEntryId] ?? null)
                // Inclui células adicionadas: compara contra effectiveTotal * barsPerCell
                const effectiveLm = lm && lm.rawBarEnd < effectiveTotal * barsPerCell ? lm : null
                const mergedBarEnd = effectiveLm ? Math.floor(effectiveLm.rawBarEnd / barsPerCell) : null

                // Botão "+" abaixo do bloco: ativa quando a última linha do bloco está em hover
                const lastOrigRowIndex = rawRows.length > 0 ? rawRows[rawRows.length - 1].origRowIndex : -1
                const lastRowKeyForEntry = lastOrigRowIndex >= 0 ? `${entryKey}-${lastOrigRowIndex}` : null
                const showAddBelowBtn = !isReadOnly && lastRowKeyForEntry !== null && hoveredRowKey === lastRowKeyForEntry

                return (
                  <div key={entryKey}>
                    {nameRowProps && (
                      <SectionNameRow
                        {...nameRowProps}
                        onSeek={() => seekToBar(sectionFirstBars.get(entryId) ?? sectionStartBar)}
                        onP2Seek={compactP2FirstBar !== undefined
                          ? () => seekToBar(compactP2FirstBar)
                          : undefined}
                        canSeek={canSeek}
                        onChipClick={passIndex === 0 ? e => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          const arrEntry = effectiveArr.find(en => en.id === entryId)
                          setChipMenu({
                            entryId,
                            blockId: block.id,
                            name: block.name,
                            customLabel: arrEntry?.customLabel ?? '',
                            hideEmptyBars,
                            loopBackToEntryId: sectionLoopBack,
                            groupProgressions: arrEntry?.groupProgressions ?? false,
                            isCompact: compactP2FirstBar !== undefined,
                            mirrorName: arrEntry?.mirrorName ?? '',
                            anchor: { x: rect.left, y: rect.bottom + 6 },
                          })
                        } : undefined}
                      />
                    )}
                    <div style={{ position: 'relative' }}>
                    {rawRows.map(({ row, origRowIndex }, ri) => {
                      const isFirst = ri === 0
                      const isLast  = ri === rawRows.length - 1

                      const slots: (MergedCell | null)[] = Array.from(
                        { length: BARS_PER_ROW },
                        (_, bi) => row[bi] ?? null,
                      )

                      // Número de slots visíveis na última linha ao ocultar compassos vazios
                      const rowCellStart = origRowIndex * BARS_PER_ROW
                      const visibleSlots = (hideEmptyBars && isLast && lastFilledCellIdx >= rowCellStart)
                        ? (lastFilledCellIdx - rowCellStart) + 1
                        : BARS_PER_ROW

                      const baseCellIndex = origRowIndex * BARS_PER_ROW
                      let loopEndCol: number | null = null
                      let loopZone = false
                      if (lm && mergedBarEnd !== null) {
                        const rowCellEnd = baseCellIndex + BARS_PER_ROW - 1
                        if (mergedBarEnd >= baseCellIndex && mergedBarEnd <= rowCellEnd)
                          loopEndCol = mergedBarEnd % BARS_PER_ROW
                        loopZone = rowCellEnd < mergedBarEnd || loopEndCol !== null
                      }

                      const rowKey = `${entryKey}-${origRowIndex}`
                      const isThisRowHovered = hoveredRowKey === rowKey
                      const isHoveredRow = hoveredBar?.gi === gi && hoveredBar.ri === origRowIndex
                      const isLastRowHovered = isLast && isThisRowHovered

                      // Row is deletable if all cells are effectively empty
                      const isDeletable = row.every((cell, bi) => {
                        const cellIndex = origRowIndex * BARS_PER_ROW + bi
                        const bKey = `${entryId}:${cellIndex}`
                        if (cellIndex < mergedCells.length) {
                          if (!cell) return true
                          return getDisplayChords(bKey).length === 0
                        }
                        return getDisplayChords(bKey).length === 0
                      })

                      return (
                        <div
                          key={rowKey}
                          style={{ position: 'relative' }}
                          onMouseEnter={() => {
                            if (rowHideTimeoutRef.current) clearTimeout(rowHideTimeoutRef.current)
                            setHoveredRowKey(rowKey)
                          }}
                          onMouseLeave={() => {
                            rowHideTimeoutRef.current = setTimeout(() => setHoveredRowKey(null), 150)
                          }}
                        >
                          {/* Fórmula de compasso — início do primeiro bloco ou antes da barra alterada */}
                          {(() => {
                            const changes = activeTab?.syncData?.timeSigChanges
                            // Detecta mudança nesta linha e em qual coluna (0–3)
                            let rowTs: { num: number; den: number } | null = null
                            let rowTsCol = 0
                            if (changes) {
                              for (let bi = 0; bi < BARS_PER_ROW; bi++) {
                                const k = `${entryId}:${baseCellIndex + bi}`
                                if (changes[k]) { rowTs = changes[k]; rowTsCol = bi; break }
                              }
                            }
                            const isInitialSlot = gi === 0 && isFirst
                            if (!isInitialSlot && !rowTs) return null

                            const displayNum = rowTs ? rowTs.num : tsNum
                            const displayDen = rowTs ? rowTs.den : tsDen
                            const isMidRow   = rowTs !== null && rowTsCol > 0
                            const barlineLeft = LABEL_COL + rowTsCol * (BAR_CELL_W + BARLINE_W)
                            const posLeft  = isMidRow ? barlineLeft - 18 : 0
                            const posWidth = isMidRow ? 18 : LABEL_COL - 2

                            return (
                            <div ref={isInitialSlot ? tsRef : undefined} style={{ position: 'absolute', left: posLeft, width: posWidth, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 10 }}>
                              <button
                                onClick={() => isInitialSlot ? setEditingTs(v => !v) : undefined}
                                title={isInitialSlot ? 'Clique para editar a fórmula de compasso' : `Fórmula: ${displayNum}/${displayDen}`}
                                style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 14, lineHeight: 1.1, color: rowTs ? '#7c3aed' : (editingTs ? '#4338ca' : '#6b7280'), background: 'none', border: 'none', padding: 0, cursor: isInitialSlot ? 'pointer' : 'default' }}
                              >
                                <span>{displayNum}</span>
                                <span style={{ borderTop: '1.5px solid currentColor', width: '100%', display: 'block', margin: '1px 0' }} />
                                <span>{displayDen}</span>
                              </button>
                              {isInitialSlot && editingTs && (
                                <div style={{ position: 'absolute', left: '100%', top: 0, marginLeft: 6, zIndex: 50, background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: 12, minWidth: 180 }} onMouseDown={e => e.stopPropagation()}>
                                  <p style={{ fontSize: 10, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Fórmula de compasso</p>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 8 }}>
                                    {([[2,4],[3,4],[4,4],[5,4],[6,8],[7,8],[9,8],[12,8]] as [number,number][]).map(([n,d]) => (
                                      <button key={`${n}/${d}`} onClick={() => saveTs(n, d)} style={{ borderRadius: 6, fontSize: 11, fontWeight: 600, padding: '5px 2px', fontFamily: 'monospace', cursor: 'pointer', background: tsNum === n && tsDen === d ? '#eef2ff' : '#f4f4f5', color: tsNum === n && tsDen === d ? '#4338ca' : '#3f3f46', border: tsNum === n && tsDen === d ? '1px solid #a5b4fc' : '1px solid transparent' }}>{n}/{d}</button>
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid #f4f4f5', paddingTop: 8 }}>
                                    <input type="number" min={1} max={32} defaultValue={tsNum} id="ccts-num" style={{ width: 44, fontSize: 11, textAlign: 'center', border: '1px solid #e4e4e7', borderRadius: 6, padding: '2px 4px', fontFamily: 'monospace', outline: 'none' }} />
                                    <span style={{ color: '#a1a1aa', fontSize: 11 }}>/</span>
                                    <input type="number" min={1} max={32} defaultValue={tsDen} id="ccts-den" style={{ width: 44, fontSize: 11, textAlign: 'center', border: '1px solid #e4e4e7', borderRadius: 6, padding: '2px 4px', fontFamily: 'monospace', outline: 'none' }} />
                                    <button onClick={() => { const n = parseInt((document.getElementById('ccts-num') as HTMLInputElement)?.value); const d = parseInt((document.getElementById('ccts-den') as HTMLInputElement)?.value); if (!isNaN(n) && !isNaN(d) && n > 0 && d > 0) saveTs(n, d) }} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#4338ca', background: 'none', border: 'none', cursor: 'pointer' }}>OK</button>
                                  </div>
                                </div>
                              )}
                            </div>
                            )
                          })()}

                          {!isReadOnly && isThisRowHovered && (
                            <button
                              onMouseEnter={() => {
                                if (rowHideTimeoutRef.current) clearTimeout(rowHideTimeoutRef.current)
                              }}
                              onMouseLeave={() => {
                                rowHideTimeoutRef.current = setTimeout(() => setHoveredRowKey(null), 150)
                              }}
                              onClick={e => {
                                if (isDeletable) {
                                  deleteRow(entryId, origRowIndex)
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setDeleteConfirm({
                                    anchor: { x: rect.right + 8, y: rect.top - 4 },
                                    onDelete: () => deleteRow(entryId, origRowIndex),
                                  })
                                }
                              }}
                              title="Deletar linha"
                              style={{
                                position: 'absolute',
                                left: -26,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                border: '1px solid #d4d4d8',
                                background: '#fff',
                                color: '#a1a1aa',
                                fontSize: 13,
                                lineHeight: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 1,
                              }}
                            >×</button>
                          )}
                          {/* Botão ÷ — divide o grupo neste ponto (entre linhas) — desabilitado em p2 */}
                          {!isFirst && !isReadOnly && (() => {
                            const splitKey = `${entryKey}-split-${origRowIndex}`
                            const isHovered = hoveredSplitKey === splitKey
                            return (
                              <div
                                style={{ position: 'absolute', top: -8, left: 0, right: 0, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                                onMouseEnter={() => setHoveredSplitKey(splitKey)}
                                onMouseLeave={() => setHoveredSplitKey(null)}
                              >
                                <button
                                  onClick={() => splitBlock(activeTabId, entryId, block.id, origRowIndex * BARS_PER_ROW)}
                                  title="Dividir grupo aqui"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: isHovered ? color : 'transparent',
                                    background: isHovered ? '#fff' : 'transparent',
                                    border: isHovered ? `1.5px solid ${color}` : '1.5px solid transparent',
                                    borderRadius: 5,
                                    padding: '1px 8px',
                                    cursor: 'pointer',
                                    fontFamily: 'system-ui, sans-serif',
                                    transition: 'color 0.15s, background 0.15s, border-color 0.15s',
                                    lineHeight: 1.4,
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  ÷
                                </button>
                              </div>
                            )
                          })()}
                          {/* Right ghost — desabilitado em p2 */}
                          {isLast && !!dragSrc && lastRowHasRoom && !isReadOnly && (
                            <div
                              onDragOver={e => { e.preventDefault(); setDragOverGhost({ entryId, type: 'right' }) }}
                              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverGhost(null) }}
                              onDrop={e => { e.preventDefault(); handleGhostDrop(entryId, 'right', totalCells) }}
                              style={{
                                position: 'absolute',
                                left: LABEL_COL + BARLINE_W + cellsInLastRow * (BAR_CELL_W + BARLINE_W),
                                top: 0,
                                bottom: 0,
                                width: BARLINE_W + BAR_CELL_W,
                                border: `1.5px dashed ${dragOverGhost?.entryId === entryId && dragOverGhost.type === 'right' ? '#6366f1' : '#94a3b8'}`,
                                borderRadius: 3,
                                background: dragOverGhost?.entryId === entryId && dragOverGhost.type === 'right'
                                  ? 'rgba(99,102,241,0.1)' : 'rgba(148,163,184,0.05)',
                                opacity: dragOverGhost?.entryId === entryId && dragOverGhost.type === 'right' ? 1 : 0.65,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'copy',
                                transition: 'opacity 0.15s, background 0.15s, border-color 0.15s',
                                zIndex: 3,
                              }}
                            >
                              <span style={{
                                fontSize: 20,
                                color: dragOverGhost?.entryId === entryId && dragOverGhost.type === 'right' ? '#6366f1' : '#94a3b8',
                                fontWeight: 300,
                                userSelect: 'none',
                                pointerEvents: 'none',
                                transition: 'color 0.15s',
                              }}>+</span>
                            </div>
                          )}
                          <GridRow
                            label={label} color={color} showLabel={isFirst && !block.name && isReadOnly}
                            openDouble={isFirst} closeDouble={isLast}
                            visibleSlots={visibleSlots}
                            onSeekSection={canSeek && isFirst && !block.name ? () => seekToBar(sectionFirstBars.get(entryId) ?? sectionStartBar) : undefined}
                            canSeek={canSeek && isFirst && !block.name}
                            slots={slots}
                            bs={bsActual}
                            chordColor={chordColor}
                            showDiagrams={showDiagrams}
                            hoveredBarCol={isHoveredRow ? hoveredBar!.col : null}
                            onBarEnter={col => setHoveredBar({ gi, ri, col })}
                            onBarLeave={() => setHoveredBar(null)}
                            onBarClick={isReadOnly ? undefined : col => {
                              if (col === -1) { setLoopMarker(entryId, null); return }
                              const clickedCell = baseCellIndex + col
                              // Sem cap: células adicionadas também são extremos válidos de loop
                              const clickedRawEnd = (clickedCell + 1) * barsPerCell - 1
                              if (effectiveLm && mergedBarEnd === clickedCell) {
                                setLoopMarker(entryId, null)
                              } else {
                                setLoopMarker(entryId, { rawBarEnd: clickedRawEnd, count: effectiveLm?.count ?? 2 })
                              }
                            }}
                            loopEndCol={loopEndCol}
                            loopCount={loopEndCol !== null ? effectiveLm!.count : undefined}
                            loopZone={loopZone}
                            onLoopCountChange={isReadOnly ? undefined : (loopEndCol !== null ? delta => {
                              setLoopMarker(entryId, { rawBarEnd: effectiveLm!.rawBarEnd, count: Math.max(1, effectiveLm!.count + delta) })
                            } : undefined)}
                            extBadge={isLast && repeatCount > 1 ? {
                              count: repeatCount,
                              color,
                              ...(isReadOnly ? {} : {
                                onInc: () => changeRepeat(entryId, 1),
                                onDec: () => changeRepeat(entryId, -1),
                              }),
                            } : (!isReadOnly && isLast && isLastRowHovered ? {
                              count: repeatCount,
                              color,
                              onInc: () => changeRepeat(entryId, 1),
                              onDec: () => changeRepeat(entryId, -1),
                            } : undefined)}
                            extraChordsPerCol={(() => {
                              const map: Record<number, string[]> = {}
                              for (let bi = 0; bi < BARS_PER_ROW; bi++) {
                                const k = `${lookupEntryId}:${baseCellIndex + bi}`
                                const ec = extraChords?.[k]
                                if (ec?.length) map[bi] = ec
                              }
                              return Object.keys(map).length ? map : undefined
                            })()}
                            onBarBottomClick={isReadOnly ? undefined : (col, rect) => {
                              const cellIndex = baseCellIndex + col
                              const key = `${entryId}:${cellIndex}`
                              const display = getDisplayChords(key)
                              setChordPickerState({
                                key,
                                anchorX: rect.left + rect.width / 2,
                                lineTop: rect.top,
                                lineBottom: rect.bottom,
                                initialValue: display[0],
                              })
                            }}
                            barNumbers={(() => {
                              const map: Record<number, number> = {}
                              for (let bi = 0; bi < BARS_PER_ROW; bi++) {
                                const k = `${entryId}:${baseCellIndex + bi}`
                                const n = filledBarIndex.get(k)
                                if (n !== undefined) map[bi] = n
                              }
                              return Object.keys(map).length ? map : undefined
                            })()}
                            dragProps={{
                              // p2: mantém barKeys com entryId p2 para isActive/pulsador funcionar
                              barKeys: Array.from({ length: BARS_PER_ROW }, (_, bi) =>
                                `${entryId}:${baseCellIndex + bi}`
                              ),
                              // p2: overrides buscados na 1ª passada para espelhar estado atual
                              overridesPerCol: (() => {
                                const map: Record<number, string[] | undefined> = {}
                                for (let bi = 0; bi < BARS_PER_ROW; bi++) {
                                  const k = `${lookupEntryId}:${baseCellIndex + bi}`
                                  map[bi] = activeTab?.chordOverrides?.[k]
                                }
                                return map
                              })(),
                              dragOverKey: dragOver?.key ?? null,
                              dragOverIndex: dragOver?.index ?? null,
                              isDraggingChord: !!dragSrc,
                              onChordDragStart: (barKey, srcIndex) => setDragSrc({ barKey, srcIndex }),
                              onChordDragEnd: () => { setDragSrc(null); setDragOver(null); setDragOverGhost(null) },
                              onSlotDragOver: (key, insertIndex) => setDragOver({ key, index: insertIndex }),
                              onSlotDrop: handleChordDrop,
                              // p2: sem interação — somente leitura
                              onChordClick: isReadOnly ? undefined : (barKey, ci, chord, rect) => {
                                setChordDeletePopup({ barKey, ci, chord, x: rect.left + rect.width / 2, y: rect.bottom + 6 })
                              },
                              onChordMouseDown: isReadOnly ? undefined : handleChordMouseDown,
                            }}
                            cellTimeSigs={(() => {
                              const changes = activeTab?.syncData?.timeSigChanges
                              if (!changes || isReadOnly) return undefined
                              const globalNum = activeTab?.syncData?.beatsPerBar ?? 4
                              const globalDen = activeTab?.syncData?.beatValue   ?? 4
                              const result: Record<number, { num: number; den: number; isChange: boolean }> = {}
                              for (let bi = 0; bi < BARS_PER_ROW; bi++) {
                                const cellIndex = baseCellIndex + bi
                                let num = globalNum, den = globalDen
                                for (let i = 0; i <= cellIndex; i++) {
                                  const ts = changes[`${lookupEntryId}:${i}`]
                                  if (ts) { num = ts.num; den = ts.den }
                                }
                                const isChange = !!changes[`${lookupEntryId}:${cellIndex}`]
                                if (num !== globalNum || den !== globalDen || isChange) {
                                  result[bi] = { num, den, isChange }
                                }
                              }
                              return Object.keys(result).length ? result : undefined
                            })()}
                            activeBarKey={activeBarKey}
                            beatPulse={animPrefs.cobrinha ? beatPulse : null}
                            showSolidFill={animPrefs.solido}
                            showBeatDot={showBeatDot}
                          />
                        </div>
                      )
                    })}
                    {/* Below ghost — absolutamente posicionado para não deslocar o layout */}
                    {!!dragSrc && (() => {
                      const isActive = dragOverGhost?.entryId === entryId && dragOverGhost.type === 'below'
                      return (
                        <div
                          data-ghost-below
                          data-ghost-entry={entryId}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: LABEL_COL,
                            right: REPEAT_COL,
                            marginTop: 2,
                            height: bsActual.rowH,
                            zIndex: 6,
                            opacity: isActive ? 1 : 0,
                            cursor: 'copy',
                            transition: 'opacity 0.15s, background 0.15s',
                            display: 'flex',
                            border: isActive ? '1.5px dashed #6366f1' : '1.5px dashed transparent',
                            borderRadius: 4,
                            background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent',
                            overflow: 'hidden',
                            pointerEvents: 'none',
                          }}
                        >
                          {Array.from({ length: BARS_PER_ROW }, (_, bi) => (
                            <div
                              key={bi}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRight: bi < BARS_PER_ROW - 1 ? '1px dashed #6366f1' : 'none',
                              }}
                            >
                              <span style={{
                                fontSize: 18,
                                color: '#6366f1',
                                fontWeight: 300,
                                userSelect: 'none',
                                pointerEvents: 'none',
                                opacity: 0.7,
                              }}>+</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    {/* Botão "+" abaixo do bloco — sem altura no layout */}
                    {showAddBelowBtn && (
                      <button
                        onMouseEnter={() => {
                          if (rowHideTimeoutRef.current) clearTimeout(rowHideTimeoutRef.current)
                        }}
                        onMouseLeave={() => {
                          rowHideTimeoutRef.current = setTimeout(() => setHoveredRowKey(null), 150)
                        }}
                        onClick={e => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          setAddMenu({ entryId, blockId: block.id, anchor: { x: rect.right + 4, y: rect.top }, onAddRow: () => addRow(entryId) })
                        }}
                        title="Adicionar"
                        style={{
                          position: 'absolute',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          top: '100%',
                          marginTop: 2,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: 'none',
                          background: 'transparent',
                          color: '#22c55e',
                          fontSize: 20,
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 2,
                          fontWeight: 400,
                          padding: 0,
                        }}
                      >+</button>
                    )}
                    </div>{/* fim do container position:relative das rows */}
                  </div>
                )
              })}
            </div>
          )
        })()}

      </div>
    </div>

    {/* ── Chord picker (ChordPickerPopover) ── */}
    {chordPickerState && (
      <ChordPickerPopover
        anchorX={chordPickerState.anchorX}
        lineTop={chordPickerState.lineTop}
        lineBottom={chordPickerState.lineBottom}
        initialValue={chordPickerState.initialValue}
        isEditing={!!chordPickerState.initialValue}
        onConfirm={chord => {
          const { key, initialValue } = chordPickerState
          const current = getDisplayChords(key)
          if (initialValue) {
            // Replace first chord (edit mode)
            setChordOverride(activeTabId, key, [chord, ...current.slice(1)])
          } else {
            // Add chord
            setChordOverride(activeTabId, key, [...current, chord])
          }
          setChordPickerState(null)
        }}
        onRemove={chordPickerState.initialValue ? () => {
          const { key } = chordPickerState
          const current = getDisplayChords(key)
          const next = current.slice(1)
          setChordOverride(activeTabId, key, next.length ? next : undefined)
          setChordPickerState(null)
        } : undefined}
        onClose={() => setChordPickerState(null)}
      />
    )}

    {/* ── Chord delete popup (for individual chord chips via right-click/drag) ── */}

    {/* ── Chord delete popup ── */}
    {chordDeletePopup && (
      <>
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001 }} onClick={() => setChordDeletePopup(null)} />
        <div
          style={{
            position: 'fixed',
            top: chordDeletePopup.y,
            left: chordDeletePopup.x,
            transform: 'translateX(-50%)',
            zIndex: 1002,
            background: '#fff',
            border: '1px solid #e4e4e7',
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: '10px 14px',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            minWidth: 120,
          }}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 20, fontWeight: 800, color: '#18181b' }}>{chordDeletePopup.chord}</span>
          <button
            onClick={() => {
              const { barKey, ci } = chordDeletePopup
              const current = getDisplayChords(barKey)
              setChordOverride(activeTabId, barKey, current.filter((_, i) => i !== ci))
              setChordDeletePopup(null)
            }}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '5px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Deletar
          </button>
        </div>
      </>
    )}
    {chipMenu && (
      <div
        ref={chipMenuRef}
        className="fixed z-50 bg-white rounded-xl shadow-xl border border-zinc-100 p-4 flex flex-col gap-3"
        style={{ left: chipMenu.anchor.x, top: chipMenu.anchor.y, width: 240, fontFamily: 'system-ui, sans-serif' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {chipMenu.isCompact ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.04em' }}>① PRIMEIRA PASSADA</span>
              <input
                autoFocus
                value={chipMenu.name}
                onChange={e => setChipMenu(m => m ? { ...m, name: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitChipMenu() }}
                placeholder="Nome da seção"
                style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#18181b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 10, color: '#71717a', fontWeight: 600, letterSpacing: '0.04em' }}>② SEGUNDA PASSADA</span>
              <input
                value={chipMenu.mirrorName}
                onChange={e => setChipMenu(m => m ? { ...m, mirrorName: e.target.value } : null)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitChipMenu() }}
                placeholder={chipMenu.name || 'Nome da 2ª passada'}
                style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '6px 10px', fontSize: 13, color: '#18181b', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        ) : (
          <input
            autoFocus
            value={chipMenu.name}
            onChange={e => setChipMenu(m => m ? { ...m, name: e.target.value } : null)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') commitChipMenu()
            }}
            placeholder="Nome da seção"
            style={{
              width: '100%',
              border: '1.5px solid #e4e4e7',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 13,
              color: '#18181b',
              outline: 'none',
            }}
          />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Identificador
          </span>
          <input
            value={chipMenu.customLabel}
            onChange={e => setChipMenu(m => m ? { ...m, customLabel: e.target.value } : null)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') commitChipMenu()
            }}
            placeholder={(() => {
              const sec = grouped.find(g => g.entryId === chipMenu.entryId)
              return sec?.label ?? 'A, B, Intro…'
            })()}
            maxLength={8}
            style={{
              width: '100%',
              border: '1.5px solid #e4e4e7',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 13,
              color: '#18181b',
              outline: 'none',
            }}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3f3f46', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={chipMenu.hideEmptyBars}
            onChange={e => {
              const val = e.target.checked
              setChipMenu(m => m ? { ...m, hideEmptyBars: val } : null)
              const next = effectiveArr.map(en => en.id === chipMenu.entryId ? { ...en, hideEmptyBars: val } : en)
              setArrangement(activeTabId, next)
            }}
          />
          Ocultar compassos vazios
        </label>

        {/* Loop-back: ao terminar este bloco, voltar para... */}
        {(() => {
          const myIdx = effectiveArr.findIndex(e => e.id === chipMenu.entryId)
          const targets = effectiveArr.slice(0, myIdx).filter(e => {
            const sec = grouped.find(g => g.entryId === e.id && g.passIndex === 0)
            return !!sec
          })
          if (myIdx <= 0) return null
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ao terminar → voltar para
              </span>
              <select
                value={chipMenu.loopBackToEntryId ?? ''}
                onChange={e => {
                  const val = e.target.value || undefined
                  setChipMenu(m => m ? { ...m, loopBackToEntryId: val, groupProgressions: val ? m.groupProgressions : false } : null)
                  const next = effectiveArr.map(en =>
                    en.id === chipMenu.entryId ? { ...en, loopBackToEntryId: val, groupProgressions: val ? en.groupProgressions : false } : en
                  )
                  setArrangement(activeTabId, next)
                }}
                style={{
                  width: '100%',
                  border: '1.5px solid #e4e4e7',
                  borderRadius: 8,
                  padding: '5px 8px',
                  fontSize: 13,
                  color: '#18181b',
                  outline: 'none',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <option value="">— sem loop —</option>
                {targets.map(e => {
                  const sec = grouped.find(g => g.entryId === e.id && g.passIndex === 0)
                  const displayName = sec?.block.name || sec?.label || e.id
                  return <option key={e.id} value={e.id}>{displayName}</option>
                })}
              </select>

              {/* Agrupar progressões — só quando loopBack está definido */}
              {chipMenu.loopBackToEntryId && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3f3f46', cursor: 'pointer', marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={chipMenu.groupProgressions}
                    onChange={e => {
                      const val = e.target.checked
                      setChipMenu(m => m ? { ...m, groupProgressions: val } : null)
                      const next = effectiveArr.map(en =>
                        en.id === chipMenu.entryId ? { ...en, groupProgressions: val } : en
                      )
                      setArrangement(activeTabId, next)
                    }}
                  />
                  Agrupar progressões
                </label>
              )}
            </div>
          )
        })()}

        <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button
            onClick={() => {
              commitChipMenu()
              duplicateBlock(activeTabId, chipMenu.blockId, chipMenu.entryId)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 8px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#3f3f46',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f5')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Duplicar grupo
          </button>
          <button
            onClick={() => {
              setChipMenu(null)
              removeBlock(activeTabId, chipMenu.blockId)
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 8px',
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#ef4444',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
            Excluir bloco
          </button>
        </div>
      </div>
    )}
    {deleteConfirm && (
      <div
        ref={deleteConfirmRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-zinc-200"
        style={{ left: deleteConfirm.anchor.x, top: deleteConfirm.anchor.y, width: 230, fontFamily: 'system-ui, sans-serif', padding: '12px 14px' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <p style={{ fontSize: 13, color: '#3f3f46', margin: '0 0 12px', lineHeight: 1.4 }}>
          Esta linha tem acordes. Deseja excluir mesmo assim?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteConfirm(null)}
            style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #e4e4e7', background: '#fff', color: '#52525b', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
          >Cancelar</button>
          <button
            onClick={() => { deleteConfirm.onDelete(); setDeleteConfirm(null) }}
            style={{ padding: '5px 12px', fontSize: 12, borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ef4444')}
          >Excluir</button>
        </div>
      </div>
    )}
    {addMenu && (
      <div
        ref={addMenuRef}
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-zinc-100"
        style={{ left: addMenu.anchor.x, top: addMenu.anchor.y, fontFamily: 'system-ui, sans-serif', minWidth: 140 }}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          onClick={() => { addMenu.onAddRow(); setAddMenu(null) }}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, fontWeight: 500, color: '#3f3f46', background: 'transparent', cursor: 'pointer', borderBottom: '1px solid #f4f4f5' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f5')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >+ nova linha</button>
        <button
          onClick={() => { addBlock(activeTabId, addMenu.blockId); setAddMenu(null) }}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, fontWeight: 500, color: '#3f3f46', background: 'transparent', cursor: 'pointer' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f5')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >+ novo grupo</button>
      </div>
    )}
    </>
  )
}
