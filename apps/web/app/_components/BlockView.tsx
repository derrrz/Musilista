'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, ReactElement } from 'react'
import { Block, BlockType, Section, SectionType, Line, ChordPosition } from '../_lib/types'
import { useEditor } from '../_context/EditorContext'
import { usePlayer } from '../_context/PlayerContext'
import { BLOCK_TYPE_LABELS, generateId, createSection } from '../_lib/utils'
import LineRenderer from './LineRenderer'
import TabEditor from './TabEditor'

const BLOCK_TYPES: BlockType[] = ['intro', 'verse', 'chorus', 'bridge', 'solo', 'unknown']

// Cores usadas apenas no submenu de seleção de tipo (swatches visuais)
const TYPE_SWATCH: Record<BlockType, { badge: string; hex: string }> = {
  header:  { badge: 'bg-zinc-100 text-zinc-500 border-zinc-200',         hex: '#4d7fa8' },
  unknown: { badge: 'bg-zinc-100 text-zinc-500 border-zinc-200',         hex: '#4d7fa8' },
  intro:   { badge: 'bg-sky-50 text-sky-600 border-sky-200',             hex: '#38bdf8' },
  verse:   { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', hex: '#10b981' },
  bridge:  { badge: 'bg-amber-100 text-amber-700 border-amber-300',      hex: '#f59e0b' },
  solo:    { badge: 'bg-rose-100 text-rose-700 border-rose-200',         hex: '#f43f5e' },
  chorus:  { badge: 'bg-violet-200 text-violet-800 border-violet-400',   hex: '#7c3aed' },
}

// Paleta de cores para blocos customizados (distintas das cores dos tipos fixos)
const CUSTOM_PALETTE = [
  '#d946ef', // fuchsia
  '#0ea5e9', // cyan
  '#f43f5e', // rose
  '#84cc16', // lime
  '#fb923c', // laranja
  '#a78bfa', // lilás
  '#34d399', // verde-água
  '#facc15', // amarelo
]

function randomCustomColor(usedColors: string[] = []): string {
  const available = CUSTOM_PALETTE.filter(c => !usedColors.includes(c))
  const pool = available.length > 0 ? available : CUSTOM_PALETTE
  return pool[Math.floor(Math.random() * pool.length)]
}
// suppress unused warning
void randomCustomColor

// Deriva estilos inline a partir de um hex para blocos customizados
function customBadgeStyle(hex: string) {
  return {
    backgroundColor: hex + '22',
    borderColor: hex + '88',
    color: hex,
  }
}
// suppress unused warning
void customBadgeStyle

const PREDEFINED_NAMES = new Set(Object.values(BLOCK_TYPE_LABELS))

// Nomes gerados automaticamente — não devem ser salvos no histórico do usuário
const DEFAULT_NAME_PATTERN = /^Bloco \d+$/

// Icons for SectionType
function IconLyricsChords() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="1.5" width="3" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
      <rect x="6" y="1.5" width="5" height="1.5" rx="0.5" fill="currentColor" opacity="0.9" />
      <rect x="1" y="5" width="13" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="8" width="13" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="11" width="9" height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function IconChordsOnly() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1"  y="1.5" width="3"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="6"  y="1.5" width="5"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1"  y="5"   width="4"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="7"  y="5"   width="3"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="12" y="5"   width="2"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1"  y="8.5" width="2"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="5"  y="8.5" width="5"   height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1"  y="12"  width="3.5" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="6"  y="12"  width="4"   height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function IconTabOnly() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="1.5"  width="13" height="1" rx="0.5" fill="currentColor" />
      <rect x="1" y="3.8"  width="13" height="1" rx="0.5" fill="currentColor" />
      <rect x="1" y="6.1"  width="13" height="1" rx="0.5" fill="currentColor" />
      <rect x="1" y="8.4"  width="13" height="1" rx="0.5" fill="currentColor" />
      <rect x="1" y="10.7" width="13" height="1" rx="0.5" fill="currentColor" />
      <rect x="1" y="13"   width="13" height="1" rx="0.5" fill="currentColor" />
      <rect x="3" y="3.2"  width="2" height="2" rx="0.8" fill="currentColor" opacity="0.75" />
      <rect x="7" y="5.5"  width="2" height="2" rx="0.8" fill="currentColor" opacity="0.75" />
      <rect x="5" y="7.8"  width="2" height="2" rx="0.8" fill="currentColor" opacity="0.75" />
    </svg>
  )
}

const SECTION_TYPE_OPTIONS: { value: SectionType; label: string; Icon: () => ReactElement }[] = [
  { value: 'LYRICS_CHORDS', label: 'Texto + Cifra', Icon: IconLyricsChords },
  { value: 'CHORDS_ONLY',   label: 'Somente Cifra', Icon: IconChordsOnly },
  { value: 'TAB',           label: 'Tablatura',     Icon: IconTabOnly },
]

// ─── Annotation area (por seção) ─────────────────────────────────────────────

function AnnotationArea({ section, tabId, blockId, block, onRemove }: {
  section: Section
  tabId: string
  blockId: string
  block: Block
  onRemove: () => void
}) {
  const { updateSection } = useEditor()
  const [value, setValue] = useState(section.annotations ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function resize() {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }

  useLayoutEffect(() => { resize() }, [value])

  useEffect(() => {
    if ((section.annotations ?? '') === '') textareaRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function commit() {
    updateSection(tabId, blockId, { ...section, annotations: value })
  }

  return (
    <div
      className="group/annotation flex items-start gap-1"
      style={{ marginTop: 'calc(var(--text-size, 14px) * 0.2)' }}
    >
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onRemove() }}
        title="Remover anotação"
        className="opacity-0 group-hover/annotation:opacity-100 shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 mt-0.5 transition-opacity"
        style={{ fontSize: 10 }}
      >
        ×
      </button>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => { setValue(e.target.value); resize() }}
        onBlur={commit}
        placeholder="Anotações…"
        rows={1}
        className="flex-1 bg-transparent outline-none resize-none text-zinc-500 placeholder:text-zinc-300 leading-snug"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-size, 14px)',
          lineHeight: 1.5,
          overflow: 'hidden',
          minHeight: '1.5em',
        }}
      />
    </div>
  )
}

// ─── ChordsOnlyLineRenderer ───────────────────────────────────────────────────

function ChordsOnlyLineRenderer({ tabId, blockId, sectionId, line, onDelete, canDelete }: {
  tabId: string
  blockId: string
  sectionId: string
  line: Line
  onDelete: () => void
  canDelete: boolean
}) {
  const { openChordSelector, chordColor, updateLine } = useEditor()
  const rowRef = useRef<HTMLDivElement>(null)
  const [ghostHovered, setGhostHovered] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<number | null>(null)

  function getBounds() {
    const r = rowRef.current?.getBoundingClientRect()
    return { lineTop: r?.top ?? 0, lineBottom: r?.bottom ?? 0 }
  }

  function getDropIndex(mouseX: number, currentSorted: ChordPosition[]): number {
    if (!rowRef.current) return currentSorted.length
    const spans = Array.from(rowRef.current.querySelectorAll('[data-chord-drag]'))
    for (let i = 0; i < spans.length; i++) {
      const rect = (spans[i] as HTMLElement).getBoundingClientRect()
      if (mouseX < rect.left + rect.width / 2) return i
    }
    return spans.length
  }

  function handleChordMouseDown(e: React.MouseEvent, chord: ChordPosition) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const anchorX = (e.currentTarget as HTMLElement).getBoundingClientRect().left
    const sorted = [...line.chords].sort((a, b) => a.position - b.position)
    let dragged = false

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:grabbing;user-select:none'
    document.body.appendChild(overlay)

    function onMouseMove(ev: MouseEvent) {
      if (!dragged && Math.abs(ev.clientX - startX) < 4 && Math.abs(ev.clientY - startY) < 4) return
      dragged = true
      setDraggingId(chord.id)
      setDropIndicator(getDropIndex(ev.clientX, sorted))
    }

    function onMouseUp(ev: MouseEvent) {
      document.body.removeChild(overlay)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      if (dragged) {
        const targetIdx = getDropIndex(ev.clientX, sorted)
        const srcIdx = sorted.findIndex(c => c.id === chord.id)
        if (srcIdx !== -1 && targetIdx !== srcIdx && targetIdx !== srcIdx + 1) {
          const next = [...sorted]
          const [moved] = next.splice(srcIdx, 1)
          const adj = targetIdx > srcIdx ? targetIdx - 1 : targetIdx
          next.splice(adj, 0, moved)
          updateLine(tabId, blockId, sectionId, { ...line, chords: next.map((c, i) => ({ ...c, position: i * 8 })) })
        }
        setDraggingId(null)
        setDropIndicator(null)
      } else {
        const { lineTop, lineBottom } = getBounds()
        openChordSelector({ tabId, blockId, sectionId, lineId: line.id, position: chord.position, existingChordId: chord.id, anchorX, lineTop, lineBottom })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function handleAddChord(e: React.MouseEvent) {
    e.stopPropagation()
    const sorted = [...line.chords].sort((a, b) => a.position - b.position)
    const nextPos = sorted.length > 0 ? sorted[sorted.length - 1].position + 8 : 0
    const { lineTop, lineBottom } = getBounds()
    openChordSelector({ tabId, blockId, sectionId, lineId: line.id, position: nextPos, anchorX: e.clientX, lineTop, lineBottom })
  }

  const sortedChords = [...line.chords].sort((a, b) => a.position - b.position)
  const isEmpty = sortedChords.length === 0

  return (
    <div className="group/chord-line flex items-center gap-1">
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onDelete() }}
        title="Remover linha"
        disabled={!canDelete}
        className="opacity-0 hover:opacity-100 shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded text-zinc-300 hover:text-red-400 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-0"
        style={{ fontSize: 10 }}
      >
        ×
      </button>

      <div
        ref={rowRef}
        className="group/chord-row flex items-center flex-wrap flex-1"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--chord-size, 14px)',
          lineHeight: 1.5,
          minHeight: '1.5em',
          gap: '0 1.5ch',
        }}
      >
        {isEmpty ? (
          <span
            onMouseEnter={() => setGhostHovered(true)}
            onMouseLeave={() => setGhostHovered(false)}
            onClick={handleAddChord}
            title="Adicionar acorde"
            className="font-bold cursor-pointer select-none"
            style={{
              color: '#6366f1',
              opacity: ghostHovered ? 0.85 : 0.22,
              transition: 'opacity 120ms ease',
              minWidth: '1ch',
            }}
          >
            +
          </span>
        ) : (
          <>
            {sortedChords.map((chord, ci) => (
              <span key={chord.id} className="inline-flex items-center">
                {dropIndicator === ci && draggingId && draggingId !== chord.id && (
                  <span className="inline-block w-0.5 h-4 bg-indigo-400 rounded mr-1 shrink-0" />
                )}
                <span
                  data-chord-drag
                  onMouseDown={e => handleChordMouseDown(e, chord)}
                  style={{
                    color: chordColor,
                    opacity: draggingId === chord.id ? 0.35 : 1,
                    cursor: 'grab',
                  }}
                  className="font-bold rounded px-0.5 hover:opacity-70 select-none"
                >
                  {chord.value}
                </span>
              </span>
            ))}
            {dropIndicator === sortedChords.length && draggingId && (
              <span className="inline-block w-0.5 h-4 bg-indigo-400 rounded shrink-0" />
            )}
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={handleAddChord}
              title="Adicionar acorde"
              className="opacity-0 group-hover/chord-row:opacity-100 flex items-center justify-center w-3.5 h-3.5 rounded text-zinc-300 hover:text-indigo-400 hover:bg-indigo-50"
              style={{ fontSize: 10 }}
            >
              +
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Notas cromáticas usadas no seletor de tonalidade ────────────────────────
const KEY_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

// Afinações nomeadas — usadas no reconhecimento do chip e nos presets do picker
const NAMED_TUNINGS: { label: string; value: string; group: string }[] = [
  { label: 'Meio tom abaixo',   value: 'Eb Ab Db Gb Bb Eb', group: 'Abaixadas' },
  { label: 'Tom abaixo',        value: 'D G C F A D',       group: 'Abaixadas' },
  { label: 'Tom e meio abaixo', value: 'C# F# B E G# C#',   group: 'Abaixadas' },
  { label: 'Dois tons abaixo',  value: 'C F Bb Eb G C',     group: 'Abaixadas' },
  { label: 'Drop D',            value: 'D A D G B E',       group: 'Drop' },
  { label: 'Drop C',            value: 'C G C F A D',       group: 'Drop' },
  { label: 'Drop B',            value: 'B F# B E G# C#',    group: 'Drop' },
  { label: 'Drop Db',           value: 'Db Ab Db Gb Bb Eb', group: 'Drop' },
  { label: 'Open G',            value: 'D G D G B D',       group: 'Open' },
  { label: 'Open D',            value: 'D A D F# A D',      group: 'Open' },
  { label: 'Open E',            value: 'E B E G# B E',      group: 'Open' },
  { label: 'Open A',            value: 'E A E A C# E',      group: 'Open' },
  { label: 'DADGAD',            value: 'D A D G A D',       group: 'Especiais' },
  { label: 'Double Drop D',     value: 'D A D G B D',       group: 'Especiais' },
]

function getTuningName(tuning: string): string | null {
  const normalize = (t: string) => t.trim().split(/\s+/).map(s => s.toLowerCase())
  const ta = normalize(tuning)
  // Busca por sequência de notas ("D A D G B E")
  const byNotes = NAMED_TUNINGS.find(n => {
    const tb = normalize(n.value)
    return ta.length === tb.length && ta.every((tok, i) => tok === tb[i])
  })
  if (byNotes) return byNotes.label
  // Busca por nome direto ("Drop D", "Open G", etc.)
  const lower = tuning.trim().toLowerCase()
  const byLabel = NAMED_TUNINGS.find(n => n.label.toLowerCase() === lower)
  if (byLabel) return byLabel.label
  // Busca parcial: tuning contém o nome (ex: "Afinação Drop D: ...")
  const byPartial = NAMED_TUNINGS.find(n => lower.includes(n.label.toLowerCase()))
  if (byPartial) return byPartial.label
  return null
}

function parseTuningNotes(tuning: string): string[] {
  return tuning.trim().split(/\s+/).filter(Boolean)
}

const STANDARD_GUITAR_HTL = ['E', 'B', 'G', 'D', 'A', 'E']

function TuningDiagram({ tuning }: { tuning: string }) {
  const notes = parseTuningNotes(tuning)
  if (notes.length !== 6) return null
  const displayNotes = [...notes].reverse()
  const thicknesses = [0.7, 0.85, 1.0, 1.3, 1.6, 2.0]

  return (
    <div className="bg-zinc-800 rounded-xl shadow-2xl px-3 py-2.5" style={{ minWidth: 130 }}>
      <p className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 leading-none">
        Afinação
      </p>
      <div className="flex flex-col gap-[5px]">
        {displayNotes.map((note, i) => {
          const std = STANDARD_GUITAR_HTL[i]
          const isAltered = note.toUpperCase() !== std.toUpperCase()
          return (
            <div key={i} className="flex items-center gap-1.5">
              <span
                className="font-mono font-bold shrink-0 text-right leading-none"
                style={{ fontSize: 10, width: '1.8ch', color: isAltered ? '#fbbf24' : '#71717a' }}
              >
                {note}
              </span>
              <div
                style={{
                  flex: 1,
                  height: thicknesses[i],
                  borderRadius: thicknesses[i],
                  background: isAltered ? '#fbbf24' : '#3f3f46',
                }}
              />
              <span
                className="font-mono shrink-0 text-right leading-none"
                style={{ fontSize: 9, width: '1.8ch', color: isAltered ? '#52525b' : 'transparent' }}
              >
                {std}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SongHeader ───────────────────────────────────────────────────────────────

export function SongHeader({ block, tabId }: { block: Block; tabId: string }) {
  const { updateBlock, renameTab, activeTab, loopMarkers, setSyncData } = useEditor()
  const { setBpm: setPlayerBpm } = usePlayer()
  const [editingField, setEditingField] = useState<'title' | 'artist' | null>(null)
  const headerLines = block.sections[0]?.lines ?? []
  const [titleValue, setTitleValue] = useState(headerLines[0]?.text ?? '')
  const [artistValue, setArtistValue] = useState(headerLines[1]?.text ?? '')

  const [keyOpen, setKeyOpen] = useState(false)
  const keyRef  = useRef<HTMLDivElement>(null)
  const songKey = block.songKey ?? ''
  const keyIsMinor = songKey.endsWith('m')
  const keyRoot    = keyIsMinor ? songKey.slice(0, -1) : songKey

  function selectKey(root: string, minor: boolean) {
    updateBlock(tabId, { ...block, songKey: root + (minor ? 'm' : '') })
    setKeyOpen(false)
  }
  function clearKey() {
    updateBlock(tabId, { ...block, songKey: undefined })
    setKeyOpen(false)
  }
  useEffect(() => {
    if (!keyOpen) return
    function onDown(e: MouseEvent) {
      if (keyRef.current && !keyRef.current.contains(e.target as Node)) setKeyOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [keyOpen])

  const [capoOpen, setCapoOpen] = useState(false)
  const capoRef = useRef<HTMLDivElement>(null)
  const capo = block.capo ?? 0
  useEffect(() => {
    if (!capoOpen) return
    function onDown(e: MouseEvent) {
      if (capoRef.current && !capoRef.current.contains(e.target as Node)) setCapoOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [capoOpen])

  const { bpm } = usePlayer()
  const isExtSynced = !!(activeTab?.syncData?.extIsPlaying || activeTab?.syncData?.extTrackId)
  const [editingBpm, setEditingBpm] = useState(false)
  function saveBpm(value: string) {
    const n = parseInt(value)
    if (isNaN(n) || n < 20 || n > 300) { setEditingBpm(false); return }
    setPlayerBpm(n)  // DevPlayer é a fonte única — propaga para ChordView e metrônomo
    const existing = activeTab?.syncData
    setSyncData(tabId, existing ? { ...existing, bpm: n } : { bpm: n, beatsPerBar: 4, offsetSeconds: 0 })
    setEditingBpm(false)
  }

  const tsNumerator   = activeTab?.syncData?.beatsPerBar ?? 4
  const tsDenominator = activeTab?.syncData?.beatValue   ?? 4
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
    const existing = activeTab?.syncData
    setSyncData(tabId, existing
      ? { ...existing, beatsPerBar: num, beatValue: den }
      : { bpm: bpm, beatsPerBar: num, beatValue: den, offsetSeconds: 0 }
    )
    setEditingTs(false)
  }

  const [tuningOpen, setTuningOpen] = useState(false)
  const [tuningHovered, setTuningHovered] = useState(false)
  const tuningRef = useRef<HTMLDivElement>(null)
  const [tuningDraft, setTuningDraft] = useState(block.tuning ?? '')
  const tuning = block.tuning ?? ''
  useEffect(() => {
    if (!tuningOpen) return
    function onDown(e: MouseEvent) {
      if (tuningRef.current && !tuningRef.current.contains(e.target as Node)) setTuningOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [tuningOpen])

  function commit(field: 'title' | 'artist') {
    const currentSection = block.sections[0]
    if (!currentSection) return
    const newLines = currentSection.lines.map((l, i) => {
      if (i === 0 && field === 'title')  return { ...l, text: titleValue }
      if (i === 1 && field === 'artist') return { ...l, text: artistValue }
      return l
    })
    updateBlock(tabId, {
      ...block,
      sections: [{ ...currentSection, lines: newLines }, ...block.sections.slice(1)],
    })
    if (field === 'title' && titleValue.trim()) renameTab(tabId, titleValue.trim())
    setEditingField(null)
  }

  const title  = headerLines[0]?.text ?? ''
  const artist = headerLines[1]?.text ?? ''
  const hasExtras = capo > 0 || tuning.length > 0

  return (
    <div className="mb-4 pb-3 border-b border-zinc-100 flex items-end justify-between gap-4">

      <div className="group/hdr flex flex-col gap-1.5 min-w-0">
        <div className="flex flex-col min-w-0" style={{ maxWidth: 220 }}>
          {/* Title — span sempre reserva espaço; input sobrepõe absolutamente */}
          <div className="relative leading-snug">
            <span
              className="text-sm font-semibold leading-snug"
              style={{ fontFamily: 'var(--font-mono)', visibility: editingField === 'title' ? 'hidden' : 'visible', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                color: editingField === 'title' ? 'transparent' : '#09090b' }}
              onDoubleClick={() => { setTitleValue(title); setEditingField('title') }}
            >
              {title || <span className="text-zinc-300 italic font-normal">Título</span>}
            </span>
            {editingField === 'title' && (
              <input
                autoFocus
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                onBlur={() => commit('title')}
                onKeyDown={e => { if (e.key === 'Enter') commit('title'); if (e.key === 'Escape') setEditingField(null) }}
                className="text-sm font-semibold text-zinc-700 bg-transparent outline-none w-full"
                style={{ fontFamily: 'var(--font-mono)', position: 'absolute', top: 0, left: 0, height: '100%', boxShadow: '0 1px 0 #a5b4fc' }}
              />
            )}
          </div>

          {/* Artist — mesma técnica */}
          <div className="relative leading-snug">
            <span
              className="text-xs leading-snug"
              style={{ fontFamily: 'var(--font-mono)', visibility: editingField === 'artist' ? 'hidden' : 'visible', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block',
                color: editingField === 'artist' ? 'transparent' : '#a1a1aa' }}
              onDoubleClick={() => { setArtistValue(artist); setEditingField('artist') }}
            >
              {artist || <span className="text-zinc-300 italic">Artista</span>}
            </span>
            {editingField === 'artist' && (
              <input
                autoFocus
                value={artistValue}
                onChange={e => setArtistValue(e.target.value)}
                onBlur={() => commit('artist')}
                onKeyDown={e => { if (e.key === 'Enter') commit('artist'); if (e.key === 'Escape') setEditingField(null) }}
                className="text-xs text-zinc-400 bg-transparent outline-none w-full"
                style={{ fontFamily: 'var(--font-mono)', position: 'absolute', top: 0, left: 0, height: '100%', boxShadow: '0 1px 0 #a5b4fc' }}
              />
            )}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 flex-wrap transition-opacity"
          style={{ opacity: hasExtras ? 1 : undefined }}
        >
          {/* Capo */}
          <div ref={capoRef} className={`relative ${!hasExtras ? 'opacity-0 group-hover/hdr:opacity-100 transition-opacity' : ''}`}>
            <button
              onClick={() => setCapoOpen(v => !v)}
              title="Capotaste"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono transition-colors
                ${capo > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  : 'text-zinc-300 border-zinc-200 hover:text-zinc-500 hover:border-zinc-300'}`}
            >
              <svg width="10" height="9" viewBox="0 0 10 9" fill="none" aria-hidden>
                <rect x="0.5" y="0.5" width="9" height="2.5" rx="0.8" fill="currentColor"/>
                <line x1="1.5" y1="3.5" x2="1.5" y2="8.5" stroke="currentColor" strokeWidth="0.8"/>
                <line x1="3.2" y1="3.5" x2="3.2" y2="8.5" stroke="currentColor" strokeWidth="0.8"/>
                <line x1="5"   y1="3.5" x2="5"   y2="8.5" stroke="currentColor" strokeWidth="0.8"/>
                <line x1="6.8" y1="3.5" x2="6.8" y2="8.5" stroke="currentColor" strokeWidth="0.8"/>
                <line x1="8.5" y1="3.5" x2="8.5" y2="8.5" stroke="currentColor" strokeWidth="0.8"/>
              </svg>
              {capo > 0 ? `Casa ${capo}` : 'Capo'}
            </button>

            {capoOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl p-2.5"
                style={{ minWidth: 148 }}
                onMouseDown={e => e.stopPropagation()}
              >
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => { updateBlock(tabId, { ...block, capo: n }); setCapoOpen(false) }}
                      className="rounded text-xs font-semibold py-1 transition-colors"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        background: capo === n ? '#f59e0b' : '#f4f4f5',
                        color:      capo === n ? '#fff'    : '#3f3f46',
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {capo > 0 && (
                  <button
                    onClick={() => { updateBlock(tabId, { ...block, capo: undefined }); setCapoOpen(false) }}
                    className="w-full text-xs text-zinc-400 hover:text-red-400 transition-colors py-1"
                  >
                    Remover capo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Afinação */}
          <div
            ref={tuningRef}
            className={`relative ${!hasExtras ? 'opacity-0 group-hover/hdr:opacity-100 transition-opacity' : ''}`}
            onMouseEnter={() => setTuningHovered(true)}
            onMouseLeave={() => setTuningHovered(false)}
          >
            <button
              onClick={() => { setTuningDraft(block.tuning ?? ''); setTuningOpen(v => !v) }}
              title="Afinação"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono transition-colors
                ${tuning
                  ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                  : 'text-zinc-300 border-zinc-200 hover:text-zinc-500 hover:border-zinc-300'}`}
            >
              <span aria-hidden style={{ fontSize: 9, lineHeight: 1 }}>🎸</span>
              {tuning ? (getTuningName(tuning) ?? tuning) : 'Afinação'}
            </button>

            {tuning && tuningHovered && !tuningOpen && (
              <div className="absolute top-full left-0 mt-1.5 z-50 pointer-events-none">
                <TuningDiagram tuning={tuning} />
              </div>
            )}

            {tuningOpen && (
              <div
                className="absolute top-full left-0 mt-1 z-50 bg-white border border-zinc-200 rounded-xl shadow-xl p-2.5"
                style={{ minWidth: 240 }}
                onMouseDown={e => e.stopPropagation()}
              >
                <input
                  autoFocus
                  value={tuningDraft}
                  onChange={e => setTuningDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { updateBlock(tabId, { ...block, tuning: tuningDraft.trim() || undefined }); setTuningOpen(false) }
                    if (e.key === 'Escape') setTuningOpen(false)
                  }}
                  placeholder="Ex: Eb Ab Db Gb Bb Eb"
                  className="w-full text-xs border border-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300 mb-2"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <div className="flex flex-col mb-2 max-h-64 overflow-y-auto">
                  {Array.from(new Set(NAMED_TUNINGS.map(n => n.group))).map(group => (
                    <div key={group}>
                      <p className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">
                        {group}
                      </p>
                      {NAMED_TUNINGS.filter(n => n.group === group).map(p => (
                        <button
                          key={p.value}
                          onClick={() => { updateBlock(tabId, { ...block, tuning: p.value }); setTuningOpen(false) }}
                          className="w-full text-left px-2 py-1 text-xs rounded hover:bg-zinc-50 flex items-center justify-between gap-3 transition-colors"
                          style={{ background: tuning === p.value ? '#f0f9ff' : undefined }}
                        >
                          <span style={{ color: tuning === p.value ? '#0369a1' : '#52525b' }}>{p.label}</span>
                          <span className="text-zinc-400 shrink-0" style={{ fontFamily: 'var(--font-mono)', fontSize: 9 }}>{p.value}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="border-t border-zinc-100 pt-2 flex items-center justify-between">
                  <button
                    onClick={() => { updateBlock(tabId, { ...block, tuning: tuningDraft.trim() || undefined }); setTuningOpen(false) }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Salvar
                  </button>
                  {tuning && (
                    <button
                      onClick={() => { updateBlock(tabId, { ...block, tuning: undefined }); setTuningOpen(false) }}
                      className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BPM + Tonalidade — empilhados verticalmente */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">

      {/* BPM */}
      <div>
        {editingBpm ? (
          <input
            type="number" min={20} max={300} defaultValue={bpm} autoFocus
            onBlur={e => saveBpm(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveBpm(e.currentTarget.value)
              if (e.key === 'Escape') setEditingBpm(false)
            }}
            className="w-16 text-xs text-center border border-indigo-300 rounded-lg px-1.5 py-1 outline-none"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-size, 14px)' }}
          />
        ) : (
          <button
            onClick={() => { if (!isExtSynced) setEditingBpm(true) }}
            title={isExtSynced ? 'BPM sincronizado pela faixa' : 'Clique para editar o BPM'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-size, 14px)',
              borderColor: '#e4e4e7',
              color: isExtSynced ? '#16a34a' : '#71717a',
              cursor: isExtSynced ? 'default' : 'pointer',
            }}
          >
            <span className="text-xs font-medium leading-none">{bpm}</span>
            <span className="text-[9px] leading-none opacity-60">BPM</span>
          </button>
        )}
      </div>


      {/* Tonalidade */}
      <div ref={keyRef} className="relative">
        <button
          onClick={() => setKeyOpen(v => !v)}
          title="Tonalidade"
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-size, 14px)',
            borderColor: keyOpen ? '#a5b4fc' : '#e4e4e7',
            background:  keyOpen ? '#eef2ff' : 'transparent',
            color:       songKey ? '#4338ca' : '#d4d4d8',
          }}
        >
          <span className="text-xs font-medium leading-none" style={{ minWidth: '1.6em', textAlign: 'center' }}>
            {songKey || 'Tom'}
          </span>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden style={{ opacity: 0.5 }}>
            <path d="M1.5 3l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {keyOpen && (
          <div
            className="absolute right-0 top-full mt-1 z-50 bg-white border border-zinc-200 rounded-xl shadow-2xl p-3"
            style={{ width: 200 }}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="grid grid-cols-6 gap-1 mb-3">
              {KEY_NOTES.map(note => (
                <button
                  key={note}
                  onClick={() => selectKey(note, keyIsMinor)}
                  className="rounded-md text-xs font-semibold py-1 transition-colors"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: keyRoot === note ? '#4f46e5' : '#f4f4f5',
                    color:      keyRoot === note ? '#fff'    : '#3f3f46',
                  }}
                >
                  {note}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg overflow-hidden border border-zinc-200">
              {(['Maior', 'Menor'] as const).map((mode, i) => {
                const isMinor  = i === 1
                const isActive = keyIsMinor === isMinor
                return (
                  <button
                    key={mode}
                    onClick={() => { if (keyRoot) selectKey(keyRoot, isMinor) }}
                    disabled={!keyRoot}
                    className="flex-1 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
                    style={{
                      background: isActive ? '#4f46e5' : '#f4f4f5',
                      color:      isActive ? '#fff'    : '#52525b',
                    }}
                  >
                    {mode}
                  </button>
                )
              })}
            </div>
            {songKey && (
              <button
                onClick={clearKey}
                className="mt-2 w-full text-xs text-zinc-400 hover:text-red-400 transition-colors py-1"
              >
                Remover tonalidade
              </button>
            )}
          </div>
        )}
      </div>

      </div>{/* fim BPM + Tonalidade */}
    </div>
  )
}

// ─── SectionView — renderiza uma seção individual ─────────────────────────────

function SectionView({
  tabId,
  block,
  section,
  previewPos,
  colWidthChars,
  isDragging,
  tuning,
  canRemove,
}: {
  tabId: string
  block: Block
  section: Section
  previewPos?: number
  colWidthChars?: number
  isDragging?: boolean
  tuning?: string
  canRemove: boolean
}) {
  const { updateBlock, updateSection, removeSection, addSection, removeLine } = useEditor()
  const [pendingLineId, setPendingLineId] = useState<string | null>(null)
  const [insertHovered, setInsertHovered] = useState(false)
  const [instMenuOpen, setInstMenuOpen] = useState(false)
  const instMenuRef = useRef<HTMLDivElement>(null)
  const headerContentRef = useRef<HTMLDivElement>(null)
  const [headerWidth, setHeaderWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!headerContentRef.current) return
    const obs = new ResizeObserver(() => setHeaderWidth(headerContentRef.current?.offsetWidth))
    obs.observe(headerContentRef.current)
    setHeaderWidth(headerContentRef.current.offsetWidth)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!instMenuOpen) return
    function onDown(e: MouseEvent) {
      if (instMenuRef.current?.contains(e.target as Node)) return
      setInstMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [instMenuOpen])

  // ── CHORDS_ONLY ──────────────────────────────────────────────────────────────
  if (section.type === 'CHORDS_ONLY') {
    const lines = section.lines
    const linesWithChords = lines.filter(l => l.chords.length > 0)
    const pendingLine = pendingLineId
      ? lines.find(l => l.id === pendingLineId && l.chords.length === 0)
      : null
    const chordsLines: Line[] = linesWithChords.length > 0
      ? (pendingLine && !linesWithChords.find(l => l.id === pendingLine.id)
          ? [...linesWithChords, pendingLine]
          : linesWithChords)
      : pendingLine
        ? [pendingLine]
        : lines.length > 0 ? [lines[0]] : []

    function deleteLine(lineId: string) {
      if (lineId === pendingLineId) setPendingLineId(null)
      removeLine(tabId, block.id, section.id, lineId)
    }

    function addLine() {
      const id = generateId()
      const newLine: Line = { id, text: '', chords: [] }
      updateSection(tabId, block.id, { ...section, lines: [...lines, newLine] })
      setPendingLineId(id)
    }

    return (
      <div>
        <SectionHeader
          section={section}
          block={block}
          tabId={tabId}
          canRemove={canRemove}
          headerContentRef={headerContentRef}
        />
        <div>
          {chordsLines.map(line => (
            <ChordsOnlyLineRenderer
              key={line.id}
              tabId={tabId}
              blockId={block.id}
              sectionId={section.id}
              line={line}
              onDelete={() => deleteLine(line.id)}
              canDelete={chordsLines.length > 1}
            />
          ))}
          {section.annotations !== undefined && (
            <AnnotationArea
              section={section}
              tabId={tabId}
              blockId={block.id}
              block={block}
              onRemove={() => updateSection(tabId, block.id, { ...section, annotations: undefined })}
            />
          )}
          <div style={{ position: 'relative', height: 0 }}>
            <div
              onClick={addLine}
              onMouseEnter={() => setInsertHovered(true)}
              onMouseLeave={() => setInsertHovered(false)}
              title="Adicionar linha"
              className="flex items-center gap-1.5 cursor-pointer"
              style={{
                position: 'absolute',
                top: chordsLines.length === 0 ? 0 : 4,
                left: 18,
                width: Math.max(40, (headerWidth ?? 120) - 18),
                opacity: insertHovered ? 1 : 0,
                pointerEvents: 'auto',
              }}
            >
              <span className="shrink-0 flex items-center justify-center w-3.5 h-3.5 rounded" style={{ fontSize: 10, color: '#6366f1' }}>+</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#a5b4fc' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── TAB ──────────────────────────────────────────────────────────────────────
  if (section.type === 'TAB') {
    return (
      <div>
        <SectionHeader
          section={section}
          block={block}
          tabId={tabId}
          canRemove={canRemove}
          headerContentRef={headerContentRef}
          extraMenu={
            <div className="relative" ref={instMenuRef}>
              <button
                onClick={() => setInstMenuOpen(v => !v)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono text-zinc-400 border-zinc-200 hover:text-zinc-600 hover:border-zinc-300 transition-colors"
              >
                {section.instrument === 'bass' ? 'Baixo' : 'Guitarra'}
                <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden style={{ opacity: 0.5 }}>
                  <path d="M1 2.5l2.5 2 2.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {instMenuOpen && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 w-max">
                  {(['guitar', 'bass'] as const).map(inst => (
                    <button
                      key={inst}
                      onClick={() => {
                        updateSection(tabId, block.id, { ...section, instrument: inst })
                        setInstMenuOpen(false)
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2
                        ${(section.instrument ?? 'guitar') === inst ? 'font-semibold text-indigo-700 bg-indigo-50' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {inst === 'guitar' ? 'Guitarra' : 'Baixo'}
                    </button>
                  ))}
                  <div className="border-t border-zinc-100 my-1" />
                  <button
                    onClick={() => {
                      if (section.annotations === undefined)
                        updateSection(tabId, block.id, { ...section, annotations: '' })
                      setInstMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2
                      ${section.annotations !== undefined ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {section.annotations !== undefined ? '✓ Anotação ativa' : 'Incluir anotação'}
                  </button>
                </div>
              )}
            </div>
          }
        />
        <TabEditor
          block={block}
          section={section}
          tabId={tabId}
          colWidthChars={colWidthChars ?? 0}
          isDragging={isDragging ?? false}
          tuning={tuning}
          annotationSlot={section.annotations !== undefined ? (
            <AnnotationArea
              section={section}
              tabId={tabId}
              blockId={block.id}
              block={block}
              onRemove={() => updateSection(tabId, block.id, { ...section, annotations: undefined })}
            />
          ) : undefined}
        />
      </div>
    )
  }

  // ── LYRICS_CHORDS (default) ──────────────────────────────────────────────────
  const lines = section.lines

  function handleAddAnnotation() {
    if (section.annotations === undefined)
      updateSection(tabId, block.id, { ...section, annotations: '' })
  }

  return (
    <div>
      <SectionHeader
        section={section}
        block={block}
        tabId={tabId}
        canRemove={canRemove}
        headerContentRef={headerContentRef}
        extraMenu={
          <button
            onClick={handleAddAnnotation}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-mono transition-colors
              ${section.annotations !== undefined
                ? 'text-indigo-600 bg-indigo-50 border-indigo-200'
                : 'text-zinc-300 border-zinc-200 hover:text-zinc-500 hover:border-zinc-300'}`}
          >
            {section.annotations !== undefined ? '✓ Anotação' : 'Anotação'}
          </button>
        }
      />
      <div>
        {lines.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">Bloco vazio</p>
        ) : (
          lines.map(line => (
            <LineRenderer
              key={line.id}
              tabId={tabId}
              blockId={block.id}
              sectionId={section.id}
              line={line}
              previewPos={previewPos}
            />
          ))
        )}
        {section.annotations !== undefined && (
          <AnnotationArea
            section={section}
            tabId={tabId}
            blockId={block.id}
            block={block}
            onRemove={() => updateSection(tabId, block.id, { ...section, annotations: undefined })}
          />
        )}
      </div>
    </div>
  )

  // suppress unused
  void addSection
  void updateBlock
}

// ─── SectionHeader — indicador de tipo + remover + menu extra ────────────────

function SectionHeader({
  section,
  block,
  tabId,
  canRemove,
  headerContentRef,
  extraMenu,
}: {
  section: Section
  block: Block
  tabId: string
  canRemove: boolean
  headerContentRef: React.RefObject<HTMLDivElement | null>
  extraMenu?: ReactElement
}) {
  const { removeSection } = useEditor()
  const opt = SECTION_TYPE_OPTIONS.find(o => o.value === section.type)
  if (!opt) return null
  const { Icon, label } = opt

  return (
    <div ref={headerContentRef} className="flex items-center gap-1.5 mb-0.5 mt-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
      <span className="flex items-center gap-1 text-zinc-300 text-[10px]" title={label}>
        <Icon />
      </span>
      {extraMenu}
      {canRemove && (
        <button
          onClick={() => removeSection(tabId, block.id, section.id)}
          title="Remover seção"
          className="ml-auto flex items-center justify-center w-3.5 h-3.5 rounded text-zinc-200 hover:text-red-400 hover:bg-red-50 transition-colors"
          style={{ fontSize: 10 }}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── BlockView ────────────────────────────────────────────────────────────────

type Props = {
  tabId: string
  block: Block
  previewPos?: number
  colWidthChars?: number
  isDragging?: boolean
  hideTabSections?: boolean
  isFirstContentBlock?: boolean
}

export default function BlockView({ tabId, block, previewPos, colWidthChars = 0, isDragging = false, hideTabSections = false, isFirstContentBlock = false }: Props) {
  const { updateBlock, customBlockTypes, saveCustomBlockType, removeCustomBlockType, activeTab, hideUnnamedBlocks, addSection, setSyncData } = useEditor()
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  const [showSubMenu, setShowSubMenu] = useState(false)
  const hideSubMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const addSectionRef = useRef<HTMLDivElement>(null)

  const cancelHide = useCallback(() => {
    if (hideSubMenuTimer.current) { clearTimeout(hideSubMenuTimer.current); hideSubMenuTimer.current = null }
  }, [])
  const scheduleHide = useCallback(() => {
    hideSubMenuTimer.current = setTimeout(() => setShowSubMenu(false), 150)
  }, [])
  const openSubMenu = useCallback(() => { cancelHide(); setShowSubMenu(true) }, [cancelHide])
  const closeSubMenuNow = useCallback(() => { cancelHide(); setShowSubMenu(false) }, [cancelHide])

  const [nameValue, setNameValue] = useState(block.name)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const typeMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showTypeMenu) setNameValue(block.name)
  }, [block.name, showTypeMenu])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (!document.contains(target)) return
      if (typeMenuRef.current && !typeMenuRef.current.contains(target)) {
        commitName()
        setShowTypeMenu(false)
      }
    }
    if (showTypeMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showTypeMenu, nameValue]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!addSectionOpen) return
    function onDown(e: MouseEvent) {
      if (addSectionRef.current?.contains(e.target as Node)) return
      setAddSectionOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [addSectionOpen])

  if (block.type === 'header') return <SongHeader block={block} tabId={tabId} />

  const isCustom = !PREDEFINED_NAMES.has(block.name) && !DEFAULT_NAME_PATTERN.test(block.name)
  const DEFAULT_BLOCK_COLOR = '#f45dd8'
  const badgeHex = block.color ?? DEFAULT_BLOCK_COLOR

  function fallbackName(): string {
    const contentBlocks = (activeTab?.blocks ?? [])
      .filter(b => b.type !== 'header')
      .sort((a, b) => a.order - b.order)
    const idx = contentBlocks.findIndex(b => b.id === block.id)
    return `Bloco ${idx + 1}`
  }

  function commitName() {
    const trimmed = nameValue.trim()
    if (!trimmed) {
      updateBlock(tabId, { ...block, name: fallbackName(), type: 'unknown', color: undefined })
      return
    }
    if (trimmed === block.name) return
    const color = block.color
    updateBlock(tabId, { ...block, name: trimmed, color })
    if (!PREDEFINED_NAMES.has(trimmed) && !DEFAULT_NAME_PATTERN.test(trimmed)) {
      saveCustomBlockType({ name: trimmed, color: color ?? '#f45dd8' })
    }
  }

  function openMenu() {
    setNameValue(block.name)
    setShowTypeMenu(true)
    setTimeout(() => nameInputRef.current?.focus(), 0)
  }

  function closeMenu() {
    commitName()
    setShowTypeMenu(false)
  }

  const shouldHideName = hideUnnamedBlocks && DEFAULT_NAME_PATTERN.test(block.name)
  const tuning = activeTab?.blocks.find(b => b.type === 'header')?.tuning
  const canRemoveSection = block.sections.length > 1

  return (
    <div
      className="group/block relative"
      style={{ marginBottom: 'calc(var(--text-size, 14px) * 1.5)' }}
    >
      {/* Block header */}
      {!shouldHideName && (
        <div className="flex items-center gap-2">
          <div className="relative" ref={typeMenuRef}>
            <span
              className="font-bold cursor-pointer"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-size, 14px)',
                lineHeight: 1.5,
                color: badgeHex,
              }}
              onClick={openMenu}
            >
              [{block.name}]
            </span>

            {showTypeMenu && (
              <div className="absolute top-full left-0 mt-1 z-50 flex items-start gap-1">
                {/* Painel esquerdo: cor + nome + ações */}
                <div className="bg-white border border-zinc-200 rounded-xl shadow-xl w-max">
                  <div className="flex items-center gap-1.5 px-2.5 py-2.5" onMouseLeave={scheduleHide}>
                    <span
                      className="w-4 h-4 rounded-sm shrink-0 cursor-pointer border border-zinc-200 hover:scale-110 transition-transform"
                      style={{ backgroundColor: badgeHex }}
                      onClick={e => { e.stopPropagation(); colorInputRef.current?.click() }}
                      onMouseEnter={() => { if (showSubMenu) cancelHide() }}
                      title="Alterar cor"
                    />
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={badgeHex}
                      onChange={e => { updateBlock(tabId, { ...block, color: e.target.value }) }}
                      className="sr-only"
                      tabIndex={-1}
                    />
                    <div className="flex-1 flex items-center min-w-0">
                      <input
                        ref={nameInputRef}
                        value={nameValue}
                        onChange={e => setNameValue(e.target.value)}
                        onFocus={() => { if (showSubMenu) cancelHide() }}
                        onBlur={scheduleHide}
                        onClick={openSubMenu}
                        onMouseEnter={() => { if (showSubMenu) cancelHide() }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') closeMenu()
                          if (e.key === 'Escape') { setNameValue(block.name); setShowTypeMenu(false) }
                        }}
                        style={{ width: nameValue ? `${nameValue.length + 1}ch` : '10ch' }}
                        className="text-xs font-semibold outline-none bg-transparent border-b border-zinc-200 pb-0.5 text-zinc-800 min-w-0 shrink-0"
                        placeholder="Nome…"
                        spellCheck={false}
                      />
                      {(() => {
                        const isFav = customBlockTypes.some(ct => ct.name === block.name)
                        const canFav = !PREDEFINED_NAMES.has(block.name) && !DEFAULT_NAME_PATTERN.test(block.name)
                        if (!canFav) return null
                        return (
                          <button
                            onMouseDown={e => e.preventDefault()}
                            onClick={e => {
                              e.stopPropagation()
                              if (isFav) removeCustomBlockType(block.name)
                              else saveCustomBlockType({ name: block.name, color: block.color ?? '#f45dd8' })
                            }}
                            title={isFav ? 'Remover dos favoritos' : 'Salvar como favorito'}
                            className="shrink-0 ml-1 transition-colors"
                            style={{ color: isFav ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}
                          >
                            <svg width="12" height="12" viewBox="0 0 13 13" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
                              <polygon points="6.5,1 8.1,4.8 12.2,5.2 9.2,7.9 10.1,12 6.5,9.8 2.9,12 3.8,7.9 0.8,5.2 4.9,4.8" />
                            </svg>
                          </button>
                        )
                      })()}
                    </div>
                    <span
                      onMouseEnter={openSubMenu}
                      className="shrink-0 leading-none cursor-default select-none"
                      style={{ fontSize: 13, color: showSubMenu ? '#6366f1' : '#d1d5db' }}
                    >
                      ›
                    </span>
                  </div>

                  <div className="border-t border-zinc-100 py-1" onMouseEnter={closeSubMenuNow}>
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setShowTypeMenu(false)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-50 flex items-center gap-2"
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-zinc-400" style={{ fontSize: 11 }}>⧉</span>
                      Duplicar bloco
                    </button>
                    <div className="border-t border-zinc-100 my-1" />
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => setShowTypeMenu(false)}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"
                    >
                      <span className="w-3.5 h-3.5 flex items-center justify-center text-red-300" style={{ fontSize: 11 }}>✕</span>
                      Deletar bloco
                    </button>
                  </div>
                </div>

                {/* Painel direito: tipos */}
                {showSubMenu && (
                  <div
                    className="bg-white border border-zinc-200 rounded-xl shadow-xl py-1 w-max"
                    onMouseEnter={openSubMenu}
                    onMouseLeave={scheduleHide}
                  >
                    {customBlockTypes.length > 0 && (
                      <>
                        <p className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Preferências</p>
                        {customBlockTypes.map(ct => {
                          const isSelected = isCustom && block.name === ct.name
                          return (
                            <div
                              key={ct.name}
                              className="flex items-center group/custom"
                              style={isSelected ? { backgroundColor: ct.color + '22' } : {}}
                            >
                              <button
                                onMouseDown={e => {
                                  e.preventDefault()
                                  updateBlock(tabId, { ...block, name: ct.name, type: 'unknown', color: ct.color })
                                  setShowTypeMenu(false)
                                }}
                                className="flex-1 text-left pl-2.5 pr-1 py-1.5 text-xs flex items-center gap-2 font-semibold"
                                style={{ color: ct.color }}
                              >
                                <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: ct.color + '44', border: `1.5px solid ${ct.color}99` }} />
                                {ct.name}
                              </button>
                              <button
                                onMouseDown={e => {
                                  e.preventDefault()
                                  removeCustomBlockType(ct.name)
                                  if (block.name === ct.name) {
                                    const fb = fallbackName()
                                    updateBlock(tabId, { ...block, name: fb, type: 'unknown', color: undefined })
                                    setNameValue(fb)
                                  }
                                }}
                                className="px-2 py-1.5 text-zinc-300 hover:text-zinc-500 opacity-0 group-hover/custom:opacity-100 transition-opacity text-xs"
                                title="Remover"
                              >
                                ×
                              </button>
                            </div>
                          )
                        })}
                        <div className="border-t border-zinc-100 my-1" />
                      </>
                    )}

                    <p className="px-2.5 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Blocos do app</p>
                    {BLOCK_TYPES.map(t => {
                      const ts = TYPE_SWATCH[t]
                      const isSelected = !isCustom && block.type === t
                      return (
                        <button
                          key={t}
                          onMouseDown={e => {
                            e.preventDefault()
                            updateBlock(tabId, { ...block, name: BLOCK_TYPE_LABELS[t], type: t, color: undefined })
                            setShowTypeMenu(false)
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center gap-2 transition-colors
                            ${isSelected ? `font-bold ${ts.badge}` : 'text-zinc-600 hover:bg-zinc-50'}`}
                        >
                          <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: ts.hex + '44', border: `1.5px solid ${ts.hex}99` }} />
                          {BLOCK_TYPE_LABELS[t]}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sections */}
      <div style={{ marginTop: 'calc(var(--text-size, 14px) * 0.375)' }}>
        {block.sections.filter(section => !(hideTabSections && section.type === 'TAB')).map(section => (
          <SectionView
            key={section.id}
            tabId={tabId}
            block={block}
            section={section}
            previewPos={previewPos}
            colWidthChars={colWidthChars}
            isDragging={isDragging}
            tuning={tuning}
            canRemove={canRemoveSection}
          />
        ))}

        {/* "+ Adicionar seção" — flutua no gap de 1 linha abaixo do bloco */}
        <div
          ref={addSectionRef}
          className="absolute left-0 w-full"
          style={{
            top: '100%',
            height: 'calc(var(--text-size, 14px) * 1.5)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setAddSectionOpen(v => !v)}
            className="opacity-0 group-hover/block:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-zinc-300 hover:text-indigo-400 transition-colors"
          >
            <span style={{ fontSize: 12 }}>+</span>
            Adicionar seção
          </button>
          {addSectionOpen && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-zinc-200 rounded-xl shadow-xl py-1 w-max">
              {SECTION_TYPE_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    addSection(tabId, block.id, value)
                    setAddSectionOpen(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 flex items-center gap-2 transition-colors"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  <span className="text-zinc-400"><Icon /></span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
