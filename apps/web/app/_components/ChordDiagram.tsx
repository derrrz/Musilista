'use client'

import { useState, useLayoutEffect, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChordVoicing, getVoicing, setCustomVoicing, resetVoicing, emptyVoicing } from '../_lib/chords'

// ─── Layout constants ─────────────────────────────────────────────────────────

const NUM_STRINGS = 6
const NUM_FRETS   = 4
const S_GAP       = 13   // horizontal space between strings
const F_GAP       = 15   // vertical space between frets
const ML          = 12   // left margin
const MR          = 10   // right margin
const MT          = 20   // top margin (X/O row)
const MB          = 8    // bottom margin

const SVG_W = ML + (NUM_STRINGS - 1) * S_GAP + MR   // 12 + 65 + 10 = 87
const SVG_H = MT + NUM_FRETS * F_GAP + MB            // 20 + 60 + 8  = 88

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e']

// ─── Fret calculation helpers ─────────────────────────────────────────────────

function calcBaseFret(frets: number[]): number {
  const pressed = frets.filter(f => f > 0)
  if (pressed.length === 0) return 1
  const minF = Math.min(...pressed)
  return minF <= 4 ? 1 : minF
}

function sx(stringIdx: number) { return ML + stringIdx * S_GAP }
function fy(fret: number, baseFret: number) {
  return MT + (fret - baseFret + 0.5) * F_GAP
}

// ─── Barre detection ──────────────────────────────────────────────────────────

interface Barre { fret: number; from: number; to: number }

function detectBarre(frets: number[], baseFret: number): Barre | null {
  const bf = baseFret
  // Find strings where fret === baseFret (potential barre)
  const indices = frets
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f === bf)
    .map(({ i }) => i)
  if (indices.length < 2) return null
  return { fret: bf, from: indices[0], to: indices[indices.length - 1] }
}

// ─── SVG Diagram ─────────────────────────────────────────────────────────────

interface DiagramProps {
  voicing: ChordVoicing
  editing?: boolean
  onToggleFret?: (stringIdx: number, fret: number) => void
  onToggleOpen?: (stringIdx: number) => void
}

function DiagramSVG({ voicing, editing, onToggleFret, onToggleOpen }: DiagramProps) {
  const { frets } = voicing
  const baseFret  = calcBaseFret(frets)
  const barre     = detectBarre(frets, baseFret)

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Nut (thick top line when baseFret === 1) */}
      <line
        x1={ML} y1={MT} x2={ML + (NUM_STRINGS - 1) * S_GAP} y2={MT}
        stroke="#333"
        strokeWidth={baseFret === 1 ? 3 : 1}
      />

      {/* Fret lines */}
      {Array.from({ length: NUM_FRETS }, (_, i) => (
        <line
          key={i}
          x1={ML} y1={MT + (i + 1) * F_GAP}
          x2={ML + (NUM_STRINGS - 1) * S_GAP} y2={MT + (i + 1) * F_GAP}
          stroke="#bbb" strokeWidth={0.8}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => (
        <line
          key={i}
          x1={sx(i)} y1={MT}
          x2={sx(i)} y2={MT + NUM_FRETS * F_GAP}
          stroke="#aaa" strokeWidth={0.8}
        />
      ))}

      {/* baseFret label */}
      {baseFret > 1 && (
        <text
          x={ML - 4} y={MT + F_GAP * 0.65}
          textAnchor="end" fontSize={8} fill="#555"
          fontFamily="monospace"
        >
          {baseFret}fr
        </text>
      )}

      {/* Barre */}
      {barre && (
        <rect
          x={sx(barre.from) - 5}
          y={fy(barre.fret, baseFret) - 5}
          width={sx(barre.to) - sx(barre.from) + 10}
          height={10}
          rx={5} ry={5}
          fill="#222"
          opacity={0.9}
        />
      )}

      {/* X / O indicators (and click targets when editing) */}
      {frets.map((fret, i) => {
        const x = sx(i)
        const y = MT - 7
        const isMuted = fret === -1
        const isOpen  = fret === 0
        return (
          <g
            key={i}
            style={{ cursor: editing ? 'pointer' : 'default' }}
            onClick={() => editing && onToggleOpen?.(i)}
          >
            {isMuted && (
              <text x={x} y={y + 2} textAnchor="middle" fontSize={10}
                fontWeight="bold" fill="#666">×</text>
            )}
            {isOpen && (
              <circle cx={x} cy={y} r={4}
                fill="none" stroke="#555" strokeWidth={1.2} />
            )}
            {editing && (
              <circle cx={x} cy={y} r={7}
                fill="transparent" />
            )}
          </g>
        )
      })}

      {/* Finger dots */}
      {frets.map((fret, i) => {
        if (fret <= 0) return null
        const adjFret = fret - baseFret + 1
        if (adjFret < 1 || adjFret > NUM_FRETS) return null
        const isBarre = barre && fret === barre.fret && i >= barre.from && i <= barre.to
        if (isBarre) return null // drawn by barre rect
        const x = sx(i)
        const y = fy(fret, baseFret)
        return (
          <g key={i}
            style={{ cursor: editing ? 'pointer' : 'default' }}
            onClick={() => editing && onToggleFret?.(i, fret)}
          >
            <circle cx={x} cy={y} r={5} fill="#222" />
          </g>
        )
      })}

      {/* Edit fret click targets (empty positions) */}
      {editing && Array.from({ length: NUM_STRINGS }, (_, si) =>
        Array.from({ length: NUM_FRETS }, (_, fi) => {
          const fret     = baseFret + fi
          const hasDot   = frets[si] === fret
          const y        = fy(fret, baseFret)
          const x        = sx(si)
          return (
            <circle
              key={`${si}-${fi}`}
              cx={x} cy={y} r={6}
              fill={hasDot ? 'transparent' : 'rgba(99,102,241,0.08)'}
              stroke={hasDot ? 'transparent' : 'rgba(99,102,241,0.25)'}
              strokeWidth={1}
              style={{ cursor: 'pointer' }}
              onClick={() => onToggleFret?.(si, fret)}
            />
          )
        })
      )}
    </svg>
  )
}

// ─── Popup (view + edit) ─────────────────────────────────────────────────────

const GAP    = 8
const MARGIN = 8

export interface ChordPopupProps {
  chordValue: string
  anchorRect: DOMRect
  onClose: () => void
}

export default function ChordPopup({ chordValue, anchorRect, onClose }: ChordPopupProps) {
  const [mode, setMode]         = useState<'view' | 'edit'>('view')
  const [voicing, setVoicing]   = useState<ChordVoicing>(() => getVoicing(chordValue) ?? emptyVoicing())
  const [placement, setPlacement] = useState<{
    left: number; top: number; arrowDir: 'up' | 'down'; arrowLeft: number
  } | null>(null)

  const ref = useRef<HTMLDivElement>(null)

  // Sync voicing if chordValue changes (shouldn't normally happen but just in case)
  useEffect(() => {
    setVoicing(getVoicing(chordValue) ?? emptyVoicing())
    setMode('view')
  }, [chordValue])

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  // Smart positioning
  useLayoutEffect(() => {
    if (!ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const rawLeft   = anchorRect.left + anchorRect.width / 2 - width / 2
    const left      = Math.max(MARGIN, Math.min(rawLeft, vw - width - MARGIN))
    const spaceBelow = vh - anchorRect.bottom - GAP
    const spaceAbove = anchorRect.top - GAP
    let top: number, arrowDir: 'up' | 'down'
    if      (spaceBelow >= height)          { top = anchorRect.bottom + GAP;             arrowDir = 'up' }
    else if (spaceAbove >= height)          { top = anchorRect.top - height - GAP;       arrowDir = 'down' }
    else if (spaceBelow >= spaceAbove)      { top = Math.max(MARGIN, anchorRect.bottom + GAP); arrowDir = 'up' }
    else                                    { top = Math.max(MARGIN, anchorRect.top - height - GAP); arrowDir = 'down' }
    const arrowLeft = Math.max(10, Math.min(anchorRect.left + anchorRect.width / 2 - left, width - 10))
    setPlacement({ left, top, arrowDir, arrowLeft })
  }, [anchorRect, mode])

  function handleToggleFret(si: number, fret: number) {
    setVoicing(prev => {
      const next = [...prev.frets] as ChordVoicing['frets']
      next[si] = next[si] === fret ? 0 : fret   // toggle: same fret → open
      return { frets: next }
    })
  }

  function handleToggleOpen(si: number) {
    setVoicing(prev => {
      const next = [...prev.frets] as ChordVoicing['frets']
      // cycle: open(0) → muted(-1) → open(0)
      next[si] = next[si] === -1 ? 0 : -1
      return { frets: next }
    })
  }

  function handleSave() {
    setCustomVoicing(chordValue, voicing)
    setMode('view')
  }

  function handleReset() {
    resetVoicing(chordValue)
    setVoicing(getVoicing(chordValue) ?? emptyVoicing())
    setMode('view')
  }

  const arrowStyle: React.CSSProperties = placement ? {
    position: 'absolute',
    left: placement.arrowLeft,
    width: 0, height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    ...(placement.arrowDir === 'up'
      ? { top: -6,    borderBottom: '6px solid #e4e4e7' }
      : { bottom: -6, borderTop:    '6px solid #e4e4e7' }),
  } : {}

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left:       placement?.left ?? -9999,
        top:        placement?.top  ?? -9999,
        visibility: placement ? 'visible' : 'hidden',
        zIndex: 9999,
      }}
      className="bg-white border border-zinc-200 rounded-xl shadow-xl p-3 select-none"
      onMouseDown={e => e.stopPropagation()}
    >
      {placement && <div aria-hidden style={arrowStyle} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-bold" style={{ color: '#4f46e5' }}>{chordValue}</span>
        <div className="flex items-center gap-1">
          {mode === 'view' ? (
            <button
              onClick={() => setMode('edit')}
              title="Editar digitação"
              className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors text-sm"
            >
              ✏
            </button>
          ) : (
            <>
              <button
                onClick={handleReset}
                className="h-6 px-2 rounded text-xs border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                Padrão
              </button>
              <button
                onClick={handleSave}
                className="h-6 px-2 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                Salvar
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors text-base leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Diagram */}
      {mode === 'view' && !getVoicing(chordValue) ? (
        <div className="text-xs text-zinc-400 text-center py-3 px-4">
          Digitação não cadastrada.<br />
          <button
            onClick={() => setMode('edit')}
            className="text-indigo-500 hover:underline mt-1"
          >
            Adicionar
          </button>
        </div>
      ) : (
        <div>
          {mode === 'edit' && (
            <p className="text-xs text-zinc-400 mb-1.5 text-center">
              Clique nas casas para posicionar os dedos.<br />
              Clique no topo da corda para alternar mudo/aberta.
            </p>
          )}
          <DiagramSVG
            voicing={voicing}
            editing={mode === 'edit'}
            onToggleFret={handleToggleFret}
            onToggleOpen={handleToggleOpen}
          />
          {/* String labels */}
          <div className="flex mt-0.5" style={{ paddingLeft: ML - 2, gap: S_GAP - 7, paddingRight: MR - 6 }}>
            {STRING_LABELS.map(l => (
              <span key={l} className="text-zinc-400 text-center" style={{ fontSize: 8, width: 7 }}>{l}</span>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
