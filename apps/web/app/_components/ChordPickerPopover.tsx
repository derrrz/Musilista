'use client'

import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { buildChordValue } from '../_lib/utils'
import { IconClose } from '@/components/ui/icons'

export const PICKER_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

export const PICKER_ACCIDENTALS = [
  { value: '', label: '♮' },
  { value: '#', label: '♯' },
  { value: 'b', label: '♭' },
]

export const PICKER_QUALITIES = [
  { value: '',     label: 'M',    title: 'Maior' },
  { value: 'm',    label: 'm',    title: 'menor' },
  { value: '7',    label: '7',    title: 'Sétima dominante' },
  { value: 'm7',   label: 'm7',   title: 'menor com sétima' },
  { value: '7M',   label: '7M',   title: 'Sétima maior' },
  { value: 'dim',  label: 'dim',  title: 'Diminuto' },
  { value: '+',    label: '+',    title: 'Aumentado' },
  { value: 'sus4', label: 'sus4', title: 'Suspensa 4' },
  { value: 'sus2', label: 'sus2', title: 'Suspensa 2' },
  { value: '9',    label: '9',    title: 'Nona dominante' },
  { value: 'm9',   label: 'm9',   title: 'menor nona' },
  { value: '6',    label: '6',    title: 'Sexta' },
  { value: '5',    label: '5',    title: 'Power Chord (tônica + quinta)' },
]

export const UNUSUAL = new Set(['Cb', 'E#', 'B#', 'Fb'])

const GAP    = 6
const MARGIN = 8

export function parseChordString(value: string): { note: string; accidental: string; quality: string } {
  const base = value.split('/')[0]
  const note = PICKER_NOTES.find(n => base.startsWith(n)) ?? 'C'
  let rest   = base.slice(note.length)
  let accidental = ''
  if (rest.startsWith('#'))      { accidental = '#'; rest = rest.slice(1) }
  else if (rest.startsWith('b')) { accidental = 'b'; rest = rest.slice(1) }
  const quality = PICKER_QUALITIES.some(q => q.value === rest) ? rest : ''
  return { note, accidental, quality }
}

interface Props {
  anchorX: number
  lineTop: number
  lineBottom: number
  /** Pre-fills pickers and switches to edit mode (shows "Salvar" + "Remover"). */
  initialValue?: string
  /** Override edit mode without initialValue (e.g. ChordSelector has existingChordId but no value). */
  isEditing?: boolean
  onConfirm(chord: string): void
  onRemove?(): void
  onClose(): void
  /** Optional extra action rendered as a small button before the confirm button. */
  extraAction?: { label: string; onClick(): void }
}

export default function ChordPickerPopover({
  anchorX, lineTop, lineBottom, initialValue, isEditing: isEditingProp, onConfirm, onRemove, onClose, extraAction,
}: Props) {
  const parsed = initialValue ? parseChordString(initialValue) : { note: 'C', accidental: '', quality: '' }

  const [note,       setNote]       = useState(parsed.note)
  const [accidental, setAccidental] = useState(parsed.accidental)
  const [quality,    setQuality]    = useState(parsed.quality)
  const [placement,  setPlacement]  = useState<{
    left: number; top: number; arrowDir: 'up' | 'down'; arrowLeft: number
  } | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)
  const isEditing  = isEditingProp ?? Boolean(initialValue)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useLayoutEffect(() => {
    if (!popoverRef.current) return
    const { width, height } = popoverRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = Math.max(MARGIN, Math.min(anchorX - 12, vw - width - MARGIN))
    const spaceBelow = vh - lineBottom - GAP
    const spaceAbove = lineTop - GAP
    let top: number
    let arrowDir: 'up' | 'down'
    if (spaceBelow >= height)          { top = lineBottom + GAP;              arrowDir = 'up' }
    else if (spaceAbove >= height)     { top = lineTop - height - GAP;        arrowDir = 'down' }
    else if (spaceBelow >= spaceAbove) { top = Math.max(MARGIN, lineBottom + GAP); arrowDir = 'up' }
    else                               { top = Math.max(MARGIN, lineTop - height - GAP); arrowDir = 'down' }
    const arrowLeft = Math.max(12, Math.min(anchorX - left, width - 12))
    setPlacement({ left, top, arrowDir, arrowLeft })
  }, [anchorX, lineTop, lineBottom])

  const preview   = buildChordValue(note, accidental, quality)
  const isUnusual = UNUSUAL.has(note + accidental)

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

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={popoverRef}
        style={{
          position: 'fixed',
          left: placement?.left ?? -9999,
          top:  placement?.top  ?? -9999,
          visibility: placement ? 'visible' : 'hidden',
        }}
        className="bg-white border border-zinc-200 rounded-xl shadow-xl p-2.5 w-64"
        onClick={e => e.stopPropagation()}
      >
        {placement && <div aria-hidden style={arrowStyle} />}

        {/* Linha 1: notas + acidentes */}
        <div className="flex items-center gap-1">
          {PICKER_NOTES.map(n => (
            <button
              key={n}
              onClick={() => setNote(n)}
              className={`flex-1 h-7 rounded text-xs font-mono font-semibold transition-colors
                ${note === n ? '' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
              style={note === n ? { background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' } : {}}
            >{n}</button>
          ))}
          <div className="w-px h-4 bg-zinc-200 mx-0.5 shrink-0" />
          {PICKER_ACCIDENTALS.map(a => (
            <button
              key={a.value}
              onClick={() => setAccidental(a.value)}
              className={`w-7 h-7 rounded text-xs font-semibold transition-colors
                ${accidental === a.value ? '' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
              style={accidental === a.value ? { background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' } : {}}
            >{a.label}</button>
          ))}
        </div>

        {/* Linha 2: qualidades (grid 6) */}
        <div className="grid grid-cols-6 gap-1 mt-1.5">
          {PICKER_QUALITIES.map(q => (
            <button
              key={q.value}
              onClick={() => setQuality(q.value)}
              title={q.title}
              className={`h-7 rounded text-xs font-semibold transition-colors
                ${quality === q.value ? '' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              style={quality === q.value ? { background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' } : {}}
            >{q.label}</button>
          ))}
        </div>

        {/* Linha 3: preview + ações */}
        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-zinc-100">
          <span
            className="flex-1 text-sm font-bold font-mono text-center"
            style={{ color: isUnusual ? '#f59e0b' : 'var(--ml-accent)' }}
          >
            {isUnusual ? 'incomum' : (preview || '—')}
          </span>
          {extraAction && (
            <button
              onClick={extraAction.onClick}
              className="h-7 px-2.5 rounded text-xs border border-zinc-200 text-zinc-500 hover:bg-zinc-50 transition-colors"
            >{extraAction.label}</button>
          )}
          {isEditing && onRemove && (
            <button
              onClick={onRemove}
              className="h-7 px-2.5 rounded text-xs border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >Remover</button>
          )}
          <button
            onClick={() => { if (!isUnusual) onConfirm(preview) }}
            disabled={isUnusual}
            className="h-7 px-3 rounded text-xs font-semibold transition-colors disabled:opacity-40"
            style={{ background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' }}
          >{isEditing ? 'Salvar' : 'Inserir'}</button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
          ><IconClose size={12} /></button>
        </div>
      </div>
    </div>
  )
}
