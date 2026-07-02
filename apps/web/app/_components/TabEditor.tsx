'use client'

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Block, TabSection, Line, ChordPosition } from '../_lib/types'
import { generateId } from '../_lib/utils'
import { useEditor } from '../_context/EditorContext'

// ─── Tunings ────────────────────────────────────────────────────────────────

type Instrument = 'guitar' | 'bass'

// Afinação padrão: ordem agudo→grave (exibição na tablatura, corda fina em cima)
const STRINGS: Record<Instrument, string[]> = {
  guitar: ['e', 'B', 'G', 'D', 'A', 'E'],
  bass:   ['G', 'D', 'A', 'E'],
}

// Deriva labels de corda a partir da string de afinação (grave→agudo) do header
function tuningToStrings(tuning: string, instrument: Instrument): string[] | null {
  const notes = tuning.trim().split(/\s+/).filter(Boolean)
  const expected = instrument === 'guitar' ? 6 : 4
  if (notes.length !== expected) return null
  return [...notes].reverse() // inverte: grave→agudo → agudo→grave (ordem da tab)
}

// ─── Tab notation cell encoding ──────────────────────────────────────────────
//
//  "-"    → no note (rest)
//  "x"    → dead / muted note
//  "5"    → fret 5
//  "5h"   → fret 5 + hammer-on     "5p"  → pull-off
//  "5/"   → slide up               "5\"  → slide down
//  "5b"   → bend                   "5r"  → release bend
//  "5~"   → vibrato
//  "t5"   → tap at fret 5
//  "<12>" → natural harmonic at fret 12

export interface CellData {
  fret:        number | null
  effect:      string   // '', 'h', 'p', '/', '\', 'b', 'r', '~'
  isDead:      boolean  // x
  isTap:       boolean  // t prefix
  isHarmonic:  boolean  // <n>
}

const EMPTY_CELL: CellData = { fret: null, effect: '', isDead: false, isTap: false, isHarmonic: false }

export function parseCellStr(v: string | null | undefined): CellData {
  if (!v || v === '-') return EMPTY_CELL
  if (v === 'x')       return { ...EMPTY_CELL, isDead: true }

  // Harmonic: <12>
  const hm = v.match(/^<(\d{1,2})>$/)
  if (hm) return { ...EMPTY_CELL, fret: parseInt(hm[1], 10), isHarmonic: true }

  // Tap prefix
  const isTap = v.startsWith('t')
  const rest  = isTap ? v.slice(1) : v

  const m = rest.match(/^(\d{1,2})([hpb\/\\~r]?)$/)
  if (!m) return EMPTY_CELL

  return { fret: parseInt(m[1], 10), effect: m[2] || '', isDead: false, isTap, isHarmonic: false }
}

function serializeCellData(d: CellData): string {
  if (d.isDead)      return 'x'
  if (d.fret === null) return '-'
  if (d.isHarmonic)  return `<${d.fret}>`
  return `${d.isTap ? 't' : ''}${d.fret}${d.effect}`
}

// ─── Column serialization ────────────────────────────────────────────────────

const TAB_SEPARATOR = '__TAB_SECTION__'

function parseCol(text: string, numStrings: number): CellData[] {
  const parts = text.split(',')
  return Array.from({ length: numStrings }, (_, i) => parseCellStr(parts[i]))
}

function serializeCol(cells: CellData[]): string {
  return cells.map(serializeCellData).join(',')
}

function emptyColumn(numStrings: number): Line {
  return {
    id: generateId(),
    text: Array<string>(numStrings).fill('-').join(','),
    chords: [],
  }
}

// ─── Section helpers ─────────────────────────────────────────────────────────

function parseSections(cols: Line[]): Line[][] {
  const result: Line[][] = []
  let cur: Line[] = []
  for (const col of cols) {
    if (col.text === TAB_SEPARATOR) { result.push(cur); cur = [] }
    else cur.push(col)
  }
  result.push(cur)
  return result
}

function flattenSections(secs: Line[][]): Line[] {
  const result: Line[] = []
  secs.forEach((sec, i) => {
    if (i > 0) result.push({ id: generateId(), text: TAB_SEPARATOR, chords: [] })
    result.push(...sec)
  })
  return result
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL_CH   = 3
const SUFFIX_CH = 2

// ─── Effect definitions ───────────────────────────────────────────────────────

const EFFECTS = [
  { sym: 'h', label: 'Hammer-on' },
  { sym: 'p', label: 'Pull-off' },
  { sym: '/', label: 'Slide ↑' },
  { sym: '\\', label: 'Slide ↓' },
  { sym: 'b', label: 'Bend' },
  { sym: 'r', label: 'Release' },
  { sym: '~', label: 'Vibrato' },
] as const

// ─── Fret Picker ─────────────────────────────────────────────────────────────

const PICKER_GAP    = 6
const PICKER_MARGIN = 8

function FretPicker({
  anchorRect,
  cellData,
  showChordSection,
  currentChord,
  onFret,
  onEffect,
  onDead,
  onTap,
  onHarmonic,
  onChord,
  onClose,
  inputValue,
  onInputChange,
  onInputKeyDown,
  inputRef,
}: {
  anchorRect:       DOMRect
  cellData:         CellData
  showChordSection: boolean
  currentChord:     string | null
  onFret:     (fret: number | null) => void
  onEffect:   (effect: string) => void
  onDead:     () => void
  onTap:      () => void
  onHarmonic: () => void
  onChord:    (label: string) => void
  onClose:    () => void
  inputValue:     string
  onInputChange:  (v: string) => void
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  inputRef:       React.RefObject<HTMLInputElement | null>
}) {
  const pickerRef   = useRef<HTMLDivElement>(null)
  const [chordDraft, setChordDraft] = useState(currentChord ?? '')
  const [placement, setPlacement]   = useState<{ left: number; top: number; arrowDir: 'up' | 'down'; arrowLeft: number } | null>(null)

  useEffect(() => { setChordDraft(currentChord ?? '') }, [currentChord])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  useLayoutEffect(() => {
    if (!pickerRef.current) return
    const { width, height } = pickerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    const rawLeft = anchorRect.left + anchorRect.width / 2 - 16
    const left    = Math.max(PICKER_MARGIN, Math.min(rawLeft, vw - width - PICKER_MARGIN))

    const spaceBelow = vh - anchorRect.bottom - PICKER_GAP
    const spaceAbove = anchorRect.top - PICKER_GAP
    let top: number
    let arrowDir: 'up' | 'down'

    if (spaceBelow >= height)         { top = anchorRect.bottom + PICKER_GAP;              arrowDir = 'up' }
    else if (spaceAbove >= height)    { top = anchorRect.top - height - PICKER_GAP;        arrowDir = 'down' }
    else if (spaceBelow >= spaceAbove){ top = Math.max(PICKER_MARGIN, anchorRect.bottom + PICKER_GAP); arrowDir = 'up' }
    else                              { top = Math.max(PICKER_MARGIN, anchorRect.top - height - PICKER_GAP); arrowDir = 'down' }

    const arrowLeft = Math.max(12, Math.min(anchorRect.left + anchorRect.width / 2 - left, width - 12))
    setPlacement({ left, top, arrowDir, arrowLeft })
  }, [anchorRect])

  const previewStr = cellData.isDead
    ? 'x'
    : cellData.fret !== null
      ? `${cellData.isTap ? 't' : ''}${cellData.isHarmonic ? '◇' : ''}${cellData.fret}${cellData.effect}`
      : inputValue || '—'

  const arrowStyle: CSSProperties = placement ? {
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
      ref={pickerRef}
      style={{
        position: 'fixed',
        left:       placement?.left ?? -9999,
        top:        placement?.top  ?? -9999,
        visibility: placement ? 'visible' : 'hidden',
        zIndex: 9999,
        width: 256,
      }}
      className="bg-white border border-zinc-200 rounded-xl shadow-xl p-2.5"
      onMouseDown={e => e.stopPropagation()}
    >
      {placement && <div aria-hidden style={arrowStyle} />}

      {/* ── Linha 1: input + preview + modificadores + fechar ── */}
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => {
            const v = e.target.value.toLowerCase()
            if (v === 'x' || v === '') { onInputChange(v); return }
            onInputChange(v.replace(/\D/g, '').slice(0, 2))
          }}
          onKeyDown={onInputKeyDown}
          placeholder="casa"
          className="w-14 h-7 text-center text-xs font-mono font-bold rounded border border-zinc-200 px-1 outline-none focus:border-indigo-400"
          style={{ color: '#4338ca' }}
          autoFocus
        />

        <span className="flex-1 text-sm font-bold font-mono text-center" style={{ color: '#4338ca' }}>
          {previewStr}
        </span>

        <div className="w-px h-4 bg-zinc-200 shrink-0" />

        {/* Modificadores */}
        {([
          { key: 'dead',     sym: 'x',  title: 'Mudo',     active: cellData.isDead,     fn: onDead },
          { key: 'tap',      sym: 't',  title: 'Tap',       active: cellData.isTap,      fn: onTap },
          { key: 'harmonic', sym: '◇',  title: 'Harmônico', active: cellData.isHarmonic, fn: onHarmonic },
        ] as const).map(({ key, sym, title, active, fn }) => (
          <button
            key={key}
            onMouseDown={e => { e.preventDefault(); fn() }}
            title={title}
            className={`w-7 h-7 rounded text-xs font-mono font-semibold transition-colors ${
              active ? 'bg-amber-400 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {sym}
          </button>
        ))}

        <button
          onMouseDown={e => { e.preventDefault(); onClose() }}
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors text-base leading-none shrink-0"
        >
          ×
        </button>
      </div>

      {/* ── Linha 2: grade de casas 0–24 (5 colunas) ── */}
      <div className="grid grid-cols-5 gap-1 mt-1.5">
        {Array.from({ length: 25 }, (_, i) => (
          <button
            key={i}
            onMouseDown={e => { e.preventDefault(); onFret(i) }}
            className={`h-7 rounded text-xs font-mono font-semibold transition-colors ${
              !cellData.isDead && !cellData.isHarmonic && cellData.fret === i
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {i}
          </button>
        ))}
      </div>

      {/* ── Linha 3: efeitos + limpar ── */}
      <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-zinc-100">
        {EFFECTS.map(({ sym, label }) => (
          <button
            key={sym}
            onMouseDown={e => { e.preventDefault(); onEffect(cellData.effect === sym ? '' : sym) }}
            title={label}
            className={`flex-1 h-7 rounded text-xs font-mono font-semibold transition-colors ${
              !cellData.isDead && cellData.effect === sym
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {sym === '\\' ? '\\' : sym}
          </button>
        ))}
        <button
          onMouseDown={e => { e.preventDefault(); onEffect('') }}
          title="Sem técnica"
          className={`flex-1 h-7 rounded text-xs font-mono transition-colors ${
            !cellData.isDead && cellData.effect === ''
              ? 'bg-zinc-300 text-zinc-700'
              : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
          }`}
        >
          —
        </button>
        <div className="w-px h-4 bg-zinc-200 shrink-0" />
        <button
          onMouseDown={e => { e.preventDefault(); onFret(null) }}
          className="h-7 px-2 rounded text-xs border border-red-200 text-red-400 hover:bg-red-50 transition-colors shrink-0"
        >
          limpar
        </button>
      </div>

      {/* ── Linha 4: acorde (só na primeira corda) ── */}
      {showChordSection && (
        <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-zinc-100">
          <span className="text-xs text-zinc-400 shrink-0">Acorde</span>
          <input
            type="text"
            value={chordDraft}
            onChange={e => setChordDraft(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter') { onChord(chordDraft.trim()); e.preventDefault() }
              if (e.key === 'Escape') onClose()
            }}
            onBlur={() => onChord(chordDraft.trim())}
            placeholder="Am, G7…"
            className="flex-1 min-w-0 text-xs rounded border border-zinc-200 px-2 py-1.5 outline-none focus:border-indigo-400"
            style={{ color: '#4338ca', fontWeight: 600 }}
          />
        </div>
      )}
    </div>,
    document.body
  )
}

// ─── Chord Label Popup ───────────────────────────────────────────────────────

function ChordLabelPopup({
  anchorRect,
  initialValue,
  chordColor,
  onSave,
  onRemove,
  onClose,
}: {
  anchorRect:   DOMRect
  initialValue: string
  chordColor:   string
  onSave:   (v: string) => void
  onRemove: () => void
  onClose:  () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState(initialValue)
  const [placement, setPlacement] = useState<{
    left: number; top: number; arrowDir: 'up' | 'down'; arrowLeft: number
  } | null>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  useLayoutEffect(() => {
    if (!ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const rawLeft  = anchorRect.left + anchorRect.width / 2 - 16
    const left     = Math.max(PICKER_MARGIN, Math.min(rawLeft, vw - width - PICKER_MARGIN))
    const spaceBelow = vh - anchorRect.bottom - PICKER_GAP
    const spaceAbove = anchorRect.top - PICKER_GAP
    let top: number, arrowDir: 'up' | 'down'
    if      (spaceBelow >= height)         { top = anchorRect.bottom + PICKER_GAP;              arrowDir = 'up' }
    else if (spaceAbove >= height)         { top = anchorRect.top - height - PICKER_GAP;        arrowDir = 'down' }
    else if (spaceBelow >= spaceAbove)     { top = Math.max(PICKER_MARGIN, anchorRect.bottom + PICKER_GAP); arrowDir = 'up' }
    else                                   { top = Math.max(PICKER_MARGIN, anchorRect.top - height - PICKER_GAP); arrowDir = 'down' }
    const arrowLeft = Math.max(12, Math.min(anchorRect.left + anchorRect.width / 2 - left, width - 12))
    setPlacement({ left, top, arrowDir, arrowLeft })
  }, [anchorRect])

  const arrowStyle: CSSProperties = placement ? {
    position: 'absolute',
    left: placement.arrowLeft,
    width: 0, height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    ...(placement.arrowDir === 'up'
      ? { top: -6,    borderBottom: '6px solid #e4e4e7' }
      : { bottom: -6, borderTop:    '6px solid #e4e4e7' }),
  } : {}

  function commit() {
    const v = draft.trim()
    v ? onSave(v) : onRemove()
  }

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: placement?.left ?? -9999,
        top:  placement?.top  ?? -9999,
        visibility: placement ? 'visible' : 'hidden',
        zIndex: 9999,
        width: 220,
      }}
      className="bg-white border border-zinc-200 rounded-xl shadow-xl p-2.5"
      onMouseDown={e => e.stopPropagation()}
    >
      {placement && <div aria-hidden style={arrowStyle} />}
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Enter') { commit(); e.preventDefault() }
            if (e.key === 'Escape') onClose()
          }}
          onBlur={commit}
          placeholder="Am, G7…"
          className="flex-1 min-w-0 h-7 text-xs rounded border border-zinc-200 px-2 outline-none focus:border-indigo-400 font-mono font-bold"
          style={{ color: chordColor }}
        />
        <button
          onMouseDown={e => { e.preventDefault(); onRemove() }}
          className="h-7 px-2.5 rounded text-xs border border-red-200 text-red-500 hover:bg-red-50 transition-colors shrink-0"
        >
          Remover
        </button>
        <button
          onMouseDown={e => { e.preventDefault(); onClose() }}
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors text-base leading-none shrink-0"
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

type Selected = { sectionIdx: number; colIdx: number; stringIdx: number }

export default function TabEditor({ block, section, tabId, colWidthChars, isDragging = false, annotationSlot, tuning }: {
  block:         Block
  section:       TabSection
  tabId:         string
  colWidthChars: number
  isDragging?:   boolean
  annotationSlot?: React.ReactNode
  tuning?:       string
}) {
  const { updateSection, chordColor } = useEditor()

  const instrument: Instrument = (section.instrument as Instrument) ?? 'guitar'

  // Usa afinação do header se disponível; senão usa padrão
  const strings = useMemo(
    () => (tuning ? tuningToStrings(tuning, instrument) : null) ?? STRINGS[instrument],
    [tuning, instrument]
  )
  const numStrings = strings.length

  // Largura do prefixo (nome da corda + '|') depende do comprimento do nome
  const strNameWidth = strings.some(s => s.length > 1) ? 2 : 1  // em ch
  const prefixCh = strNameWidth + 0.5 + 1  // nome + gap + barra

  const allCols  = section.lines
  const sections = parseSections(allCols)

  // Display-only redistribution during drag
  const renderSections = useMemo(() => {
    if (!isDragging || colWidthChars <= 0) return sections
    const target = Math.max(1, Math.floor((colWidthChars - prefixCh - SUFFIX_CH) / CELL_CH) - 1)
    const flat = sections.flat()
    let lastNoteIdx = -1
    for (let i = flat.length - 1; i >= 0; i--) {
      if (parseCol(flat[i].text, numStrings).some(c => c.fret !== null || c.isDead)) { lastNoteIdx = i; break }
    }
    const neededCols = lastNoteIdx < 0 ? target : Math.ceil((lastNoteIdx + 1) / target) * target
    const result: Line[][] = []
    for (let i = 0; i < neededCols; i += target) {
      const chunk = flat.slice(i, i + target)
      result.push([...chunk, ...Array.from({ length: target - chunk.length }, () => emptyColumn(numStrings))])
    }
    return result.length > 0 ? result : [Array.from({ length: target }, () => emptyColumn(numStrings))]
  }, [isDragging, colWidthChars, sections, numStrings]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── auto-resize ───────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (colWidthChars <= 0 || isDragging) return
    const target = Math.max(1, Math.floor((colWidthChars - prefixCh - SUFFIX_CH) / CELL_CH) - 1)

    const allCols = sections.flat()
    let lastNoteIdx = -1
    for (let i = allCols.length - 1; i >= 0; i--) {
      if (parseCol(allCols[i].text, numStrings).some(c => c.fret !== null || c.isDead)) {
        lastNoteIdx = i; break
      }
    }

    const neededCols = lastNoteIdx < 0
      ? target
      : Math.ceil((lastNoteIdx + 1) / target) * target

    const newSections: Line[][] = []
    for (let i = 0; i < neededCols; i += target) {
      const chunk = allCols.slice(i, i + target)
      newSections.push([
        ...chunk,
        ...Array.from({ length: target - chunk.length }, () => emptyColumn(numStrings)),
      ])
    }

    const changed =
      sections.length !== newSections.length ||
      sections.some((sec, si) => sec.length !== (newSections[si]?.length ?? -1))
    if (!changed) return

    updateSection(tabId, block.id, { ...section, lines: flattenSections(newSections) })
  }, [colWidthChars, isDragging]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── state ─────────────────────────────────────────────────────────────────
  const [selected,        setSelected]        = useState<Selected | null>(null)
  const [inputValue,      setInputValue]      = useState('')
  const [pickerAnchor,    setPickerAnchor]    = useState<DOMRect | null>(null)
  const [addHovered,      setAddHovered]      = useState(false)
  const [chordLabelMenu,  setChordLabelMenu]  = useState<{
    sectionIdx: number; colIdx: number; anchorRect: DOMRect; draft: string
  } | null>(null)

  const inputRef     = useRef<HTMLInputElement | null>(null)
  const cellRefs     = useRef<Map<string, HTMLDivElement>>(new Map())
  const chordRowRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (selected !== null) setTimeout(() => inputRef.current?.focus(), 0)
  }, [selected])

  useEffect(() => {
    if (selected === null) setPickerAnchor(null)
  }, [selected])

  // ── data helpers ──────────────────────────────────────────────────────────

  function getCellData(sectionIdx: number, colIdx: number, sIdx: number): CellData {
    const col = renderSections[sectionIdx]?.[colIdx]
    if (!col) return EMPTY_CELL
    return parseCol(col.text, numStrings)[sIdx] ?? EMPTY_CELL
  }

  function getChordLabel(sectionIdx: number, colIdx: number): string | null {
    return renderSections[sectionIdx]?.[colIdx]?.chords[0]?.value ?? null
  }

  // ── mutation helpers ──────────────────────────────────────────────────────

  function updateCell(sectionIdx: number, colIdx: number, sIdx: number, data: CellData) {
    const col = sections[sectionIdx]?.[colIdx]
    if (!col) return
    const cells = parseCol(col.text, numStrings)
    cells[sIdx] = data
    const newCol: Line = { ...col, text: serializeCol(cells) }
    const newSections = sections.map((sec, si) =>
      si === sectionIdx ? sec.map((c, ci) => ci === colIdx ? newCol : c) : sec
    )
    updateSection(tabId, block.id, { ...section, lines: flattenSections(newSections) })
  }

  function applyFret(sectionIdx: number, colIdx: number, sIdx: number, fret: number | null) {
    const existing = getCellData(sectionIdx, colIdx, sIdx)
    if (fret === null) {
      updateCell(sectionIdx, colIdx, sIdx, EMPTY_CELL)
    } else {
      updateCell(sectionIdx, colIdx, sIdx, {
        ...existing, fret, isDead: false, isHarmonic: false,
      })
    }
  }

  function applyEffect(sectionIdx: number, colIdx: number, sIdx: number, effect: string) {
    const existing = getCellData(sectionIdx, colIdx, sIdx)
    if (existing.isDead || existing.fret === null) return
    updateCell(sectionIdx, colIdx, sIdx, { ...existing, effect })
  }

  function applyDead(sectionIdx: number, colIdx: number, sIdx: number) {
    const existing = getCellData(sectionIdx, colIdx, sIdx)
    if (existing.isDead) {
      updateCell(sectionIdx, colIdx, sIdx, EMPTY_CELL)
    } else {
      updateCell(sectionIdx, colIdx, sIdx, { ...EMPTY_CELL, isDead: true })
    }
  }

  function applyTap(sectionIdx: number, colIdx: number, sIdx: number) {
    const existing = getCellData(sectionIdx, colIdx, sIdx)
    if (existing.isDead || existing.fret === null) return
    updateCell(sectionIdx, colIdx, sIdx, { ...existing, isTap: !existing.isTap })
  }

  function applyHarmonic(sectionIdx: number, colIdx: number, sIdx: number) {
    const existing = getCellData(sectionIdx, colIdx, sIdx)
    if (existing.fret === null && !existing.isHarmonic) return
    if (existing.isHarmonic) {
      updateCell(sectionIdx, colIdx, sIdx, { ...existing, isHarmonic: false })
    } else {
      updateCell(sectionIdx, colIdx, sIdx, { ...existing, isDead: false, isTap: false, effect: '', isHarmonic: true })
    }
  }

  function applyChordLabel(sectionIdx: number, colIdx: number, label: string) {
    const col = sections[sectionIdx]?.[colIdx]
    if (!col) return
    const newChords: ChordPosition[] = label
      ? [{ id: generateId(), value: label, position: 0 }]
      : []
    const newCol: Line = { ...col, chords: newChords }
    const newSections = sections.map((sec, si) =>
      si === sectionIdx ? sec.map((c, ci) => ci === colIdx ? newCol : c) : sec
    )
    updateSection(tabId, block.id, { ...section, lines: flattenSections(newSections) })
  }

  function moveChordLabel(fromSecIdx: number, fromColIdx: number, toColIdx: number) {
    const fromCol = sections[fromSecIdx]?.[fromColIdx]
    const toCol   = sections[fromSecIdx]?.[toColIdx]
    if (!fromCol || !toCol) return
    const chord = fromCol.chords[0]
    if (!chord) return
    const newSections = sections.map((sec, si) => {
      if (si !== fromSecIdx) return sec
      return sec.map((c, ci) => {
        if (ci === fromColIdx) return { ...c, chords: [] }
        if (ci === toColIdx)   return { ...c, chords: [{ ...chord }] }
        return c
      })
    })
    updateSection(tabId, block.id, { ...section, lines: flattenSections(newSections) })
  }

  function handleChordLabelMouseDown(
    e: React.MouseEvent<HTMLSpanElement>,
    sectionIdx: number,
    colIdx: number,
  ) {
    e.preventDefault()
    e.stopPropagation()

    // Measure 1ch in current font
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;font-family:var(--font-mono);font-size:var(--text-size,14px);width:1ch`
    document.body.appendChild(probe)
    const chWidth = probe.getBoundingClientRect().width || 8.4
    document.body.removeChild(probe)

    const anchorRect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    let dragged  = false

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:grabbing;user-select:none'
    document.body.appendChild(overlay)

    // Prefix offset in the chord row: strName + 0.5ch margin + 1ch bar placeholder
    const rowEl    = chordRowRefs.current.get(sectionIdx)
    const prefixPx = prefixCh * chWidth

    function onMouseMove(ev: MouseEvent) {
      if (!dragged && Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return
      dragged = true
    }

    function onMouseUp(ev: MouseEvent) {
      document.body.removeChild(overlay)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (!dragged) {
        const chord = renderSections[sectionIdx]?.[colIdx]?.chords[0]
        setChordLabelMenu({ sectionIdx, colIdx, anchorRect, draft: chord?.value ?? '' })
      } else if (rowEl) {
        const rowLeft   = rowEl.getBoundingClientRect().left
        const rawCol    = Math.round((ev.clientX - rowLeft - prefixPx) / (CELL_CH * chWidth))
        const newColIdx = Math.max(0, Math.min(rawCol, (sections[sectionIdx]?.length ?? 1) - 1))
        if (newColIdx !== colIdx) moveChordLabel(sectionIdx, colIdx, newColIdx)
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // ── input handling ────────────────────────────────────────────────────────

  function commitInput(sel = selected, val = inputValue) {
    if (!sel) return
    const trimmed = val.trim().toLowerCase()
    if (trimmed === 'x') {
      applyDead(sel.sectionIdx, sel.colIdx, sel.stringIdx)
    } else {
      const n = parseInt(trimmed, 10)
      const fret = trimmed === '' ? null : (!isNaN(n) && n >= 0 && n <= 24 ? n : null)
      applyFret(sel.sectionIdx, sel.colIdx, sel.stringIdx, fret)
    }
    setSelected(null)
    setInputValue('')
  }

  function openCell(sectionIdx: number, colIdx: number, sIdx: number) {
    if (selected && (selected.sectionIdx !== sectionIdx || selected.colIdx !== colIdx || selected.stringIdx !== sIdx)) {
      commitInput()
    }
    const cell = getCellData(sectionIdx, colIdx, sIdx)
    setSelected({ sectionIdx, colIdx, stringIdx: sIdx })
    setInputValue(cell.isDead ? 'x' : cell.fret !== null ? String(cell.fret) : '')

    const key = `${sectionIdx}-${colIdx}-${sIdx}`
    const el  = cellRefs.current.get(key)
    if (el) setPickerAnchor(el.getBoundingClientRect())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commitInput()
    } else if (e.key === 'Escape') {
      setSelected(null); setInputValue('')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (!selected) return
      const nextS = (selected.stringIdx + 1) % numStrings
      const nextC = nextS === 0 ? selected.colIdx + 1 : selected.colIdx
      commitInput()
      const sec = sections[selected.sectionIdx]
      if (nextC < sec.length) {
        const key = `${selected.sectionIdx}-${nextC}-${nextS}`
        const el  = cellRefs.current.get(key)
        const cell = getCellData(selected.sectionIdx, nextC, nextS)
        setSelected({ sectionIdx: selected.sectionIdx, colIdx: nextC, stringIdx: nextS })
        setInputValue(cell.isDead ? 'x' : cell.fret !== null ? String(cell.fret) : '')
        if (el) setPickerAnchor(el.getBoundingClientRect())
      }
    } else if (e.key === 'Backspace' && inputValue === '') {
      if (selected) {
        const cell = getCellData(selected.sectionIdx, selected.colIdx, selected.stringIdx)
        if (cell.fret !== null || cell.isDead) {
          updateCell(selected.sectionIdx, selected.colIdx, selected.stringIdx, EMPTY_CELL)
        }
      }
      setSelected(null); setInputValue('')
    }
  }

  function deleteSection(sectionIdx: number) {
    const newSections = sections.filter((_, i) => i !== sectionIdx)
    updateSection(tabId, block.id, { ...section, lines: flattenSections(newSections) })
  }

  function addSection() {
    const target  = Math.max(0, Math.floor((colWidthChars - prefixCh - SUFFIX_CH) / CELL_CH) - 1)
    const newSec  = Array.from({ length: target }, () => emptyColumn(numStrings))
    updateSection(tabId, block.id, { ...section, lines: flattenSections([...sections, newSec]) })
  }

  // ── render ────────────────────────────────────────────────────────────────

  const selData = selected
    ? getCellData(selected.sectionIdx, selected.colIdx, selected.stringIdx)
    : EMPTY_CELL

  return (
    <div style={{ marginTop: 'calc(var(--text-size, 14px) * 0.375)' }}>

      {renderSections.map((sectionCols, sectionIdx) => {
        const hasChordLabels = sectionCols.some(col => col.chords.length > 0)

        return (
          <div
            key={sectionIdx}
            className="group/tab-section flex items-start gap-1"
            style={{ marginBottom: sectionIdx < renderSections.length - 1 ? 'calc(var(--text-size, 14px) * 1.2)' : 0 }}
          >
            {/* × delete section */}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); deleteSection(sectionIdx) }}
              title="Remover seção"
              disabled={sections.length <= 1}
              className="opacity-0 group-hover/tab-section:opacity-100 shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-0 transition-opacity"
              style={{ fontSize: 10, marginTop: 'calc(var(--text-size, 14px) * 0.4)' }}
            >
              ×
            </button>

            <div
              className="inline-flex flex-col select-none"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   'var(--text-size, 14px)',
                lineHeight: 1.8,
              }}
            >
              {/* ── Chord label row ── */}
              {hasChordLabels && (
                <div
                  ref={el => { if (el) chordRowRefs.current.set(sectionIdx, el); else chordRowRefs.current.delete(sectionIdx) }}
                  className="flex items-center"
                  style={{ lineHeight: 1.4 }}
                >
                  <span className="shrink-0" style={{ width: `${strNameWidth}ch`, marginRight: '0.5ch' }} aria-hidden />
                  <span className="shrink-0" style={{ width: '1ch' }} aria-hidden />
                  {sectionCols.map((col, cIdx) => (
                    <div
                      key={col.id}
                      className="shrink-0 flex items-center"
                      style={{ width: `${CELL_CH}ch`, height: '1.4em' }}
                    >
                      {col.chords[0] && (
                        <span
                          onMouseDown={e => handleChordLabelMouseDown(e, sectionIdx, cIdx)}
                          className="font-bold leading-none whitespace-nowrap cursor-grab active:cursor-grabbing"
                          style={{ color: chordColor, fontSize: 'inherit' }}
                        >
                          {col.chords[0].value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── String rows ── */}
              {strings.map((strName, sIdx) => (
                <div key={sIdx} className="flex items-center">
                  <span
                    className="text-zinc-400 shrink-0 text-right"
                    style={{ width: `${strNameWidth}ch`, marginRight: '0.5ch', userSelect: 'none' }}
                  >
                    {strName}
                  </span>
                  <span className="text-zinc-400 shrink-0">|</span>

                  {sectionCols.map((col, cIdx) => {
                    const cell    = getCellData(sectionIdx, cIdx, sIdx)
                    const hasContent = cell.fret !== null || cell.isDead
                    const isSel   = selected?.sectionIdx === sectionIdx && selected?.colIdx === cIdx && selected?.stringIdx === sIdx
                    const key     = `${sectionIdx}-${cIdx}-${sIdx}`

                    const fretColor = cell.isDead ? '#9ca3af' : cell.isHarmonic ? '#d97706' : chordColor

                    // Fret string only (effect is absolutely positioned between columns)
                    const fretStr = isSel
                      ? (inputValue !== '' ? inputValue : '○')
                      : hasContent
                        ? `${cell.isTap ? 't' : ''}${cell.isDead ? 'x' : cell.isHarmonic ? `◇${cell.fret}` : String(cell.fret)}`
                        : ''

                    const hasEffect = Boolean(cell.effect) && !isSel

                    // Look ahead: does the next cell have content?
                    const nextCell       = cIdx + 1 < sectionCols.length ? getCellData(sectionIdx, cIdx + 1, sIdx) : null
                    const nextHasContent = Boolean(nextCell && (nextCell.fret !== null || nextCell.isDead))

                    // Trailing dashes:
                    //  • suppress entirely when this cell has an effect (no line between the two frets)
                    //  • replace last dash with a non-breaking space when next cell has content
                    //    (line ends cleanly before the fret number, with a tiny visual gap)
                    const rawDashCount = hasEffect ? 0 : Math.max(0, CELL_CH - fretStr.length)
                    const trailingDashes = rawDashCount === 0
                      ? ''
                      : nextHasContent
                        ? '─'.repeat(rawDashCount - 1) + '\u00a0'
                        : '─'.repeat(rawDashCount)

                    return (
                      <div
                        key={col.id}
                        ref={el => { if (el) cellRefs.current.set(key, el); else cellRefs.current.delete(key) }}
                        onClick={() => openCell(sectionIdx, cIdx, sIdx)}
                        className="relative shrink-0 flex items-center cursor-pointer"
                        style={{ width: `${CELL_CH}ch`, height: '1.8em' }}
                      >
                        {/* Fret number / placeholder */}
                        {fretStr && (
                          <span
                            className="font-bold leading-none"
                            style={{
                              color: isSel ? '#4338ca' : fretColor,
                              background: isSel ? '#eef2ff' : undefined,
                              borderRadius: isSel ? 2 : undefined,
                              paddingInline: isSel ? '1px' : undefined,
                              whiteSpace: 'pre',
                            }}
                          >
                            {fretStr}
                          </span>
                        )}
                        {/* String line dashes */}
                        <span
                          aria-hidden
                          className="text-zinc-200 leading-none"
                          style={{ whiteSpace: 'pre', pointerEvents: 'none' }}
                        >
                          {fretStr ? trailingDashes : '─'.repeat(CELL_CH)}
                        </span>
                        {/* Effect — centered between this column's fret and next column's fret.
                            Placed at 2/3 of cell width: midpoint between left-aligned fret
                            (center ≈ 0.5ch) and next cell's fret (center ≈ 3.5ch) = 2ch. */}
                        {hasEffect && (
                          <span
                            aria-hidden
                            style={{
                              position: 'absolute',
                              left: `${(CELL_CH * 2) / 3}ch`,
                              top: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontWeight: 'bold',
                              fontSize: 'inherit',
                              lineHeight: 1,
                              color: fretColor,
                              background: 'white',
                              zIndex: 10,
                              pointerEvents: 'none',
                              whiteSpace: 'pre',
                            }}
                          >
                            {cell.effect}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  <span className="text-zinc-400 shrink-0">|</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* ── Fret Picker ── */}
      {selected !== null && pickerAnchor && (
        <FretPicker
          anchorRect={pickerAnchor}
          cellData={selData}
          showChordSection={selected.stringIdx === 0}
          currentChord={getChordLabel(selected.sectionIdx, selected.colIdx)}
          onFret={fret => {
            applyFret(selected.sectionIdx, selected.colIdx, selected.stringIdx, fret)
            setInputValue(fret !== null ? String(fret) : '')
            inputRef.current?.focus()
          }}
          onEffect={effect => {
            applyEffect(selected.sectionIdx, selected.colIdx, selected.stringIdx, effect)
          }}
          onDead={() => {
            applyDead(selected.sectionIdx, selected.colIdx, selected.stringIdx)
            setInputValue(selData.isDead ? '' : 'x')
            inputRef.current?.focus()
          }}
          onTap={() => {
            applyTap(selected.sectionIdx, selected.colIdx, selected.stringIdx)
          }}
          onHarmonic={() => {
            applyHarmonic(selected.sectionIdx, selected.colIdx, selected.stringIdx)
          }}
          onChord={label => applyChordLabel(selected.sectionIdx, selected.colIdx, label)}
          onClose={() => { commitInput() }}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onInputKeyDown={handleKeyDown}
          inputRef={inputRef}
        />
      )}

      {chordLabelMenu && (
        <ChordLabelPopup
          anchorRect={chordLabelMenu.anchorRect}
          initialValue={chordLabelMenu.draft}
          chordColor={chordColor}
          onSave={value => {
            applyChordLabel(chordLabelMenu.sectionIdx, chordLabelMenu.colIdx, value)
            setChordLabelMenu(null)
          }}
          onRemove={() => {
            applyChordLabel(chordLabelMenu.sectionIdx, chordLabelMenu.colIdx, '')
            setChordLabelMenu(null)
          }}
          onClose={() => setChordLabelMenu(null)}
        />
      )}

      {annotationSlot}

      {/* ── Add section button ── */}
      <div style={{ position: 'relative', height: 0 }}>
        <div
          onClick={addSection}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          title="Adicionar tablatura"
          className="flex items-center gap-1.5 cursor-pointer"
          style={{
            position: 'absolute', top: 4, left: 0, right: 0,
            opacity: addHovered ? 1 : 0,
            pointerEvents: 'auto',
            transition: 'opacity 150ms ease',
          }}
        >
          <span className="shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded" style={{ fontSize: 10, color: '#6366f1' }}>+</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#a5b4fc' }} />
        </div>
      </div>
    </div>
  )
}
