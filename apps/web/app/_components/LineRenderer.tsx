'use client'

import { useRef, useState, useCallback } from 'react'
import { Line, ChordPosition } from '../_lib/types'
import { useEditor } from '../_context/EditorContext'
import { shiftChordsOnInsert, shiftChordsOnDelete, isChordInKey } from '../_lib/utils'
import ChordPopup from './ChordDiagram'

type Props = {
  tabId: string
  blockId: string
  sectionId: string
  line: Line
  previewPos?: number
}

export default function LineRenderer({ tabId, blockId, sectionId, line, previewPos }: Props) {
  const { openChordSelector, closeChordSelector, updateChord, updateLine, chordColor, highlightOutOfKey, activeSongKey } = useEditor()
  const chordLayerRef = useRef<HTMLDivElement>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  // ── Chord diagram popup ──────────────────────────────────────────────────
  const [popup, setPopup] = useState<{ chord: ChordPosition; rect: DOMRect } | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChordMouseEnter = useCallback((e: React.MouseEvent<HTMLSpanElement>, chord: ChordPosition) => {
    if (previewPos !== undefined) return
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    hoverTimer.current = setTimeout(() => setPopup({ chord, rect }), 350)
  }, [previewPos])

  const handleChordMouseLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
  }, [])

  // Retorna os limites verticais apenas do input de texto (letra)
  // A camada de acordes pode ser sobreposta — só a letra não
  function getLineBounds() {
    const inputRect = inputRef.current?.getBoundingClientRect()
    return {
      lineTop: inputRect?.top ?? 0,
      lineBottom: inputRect?.bottom ?? 0,
    }
  }

  // Clique no texto → abre o seletor de acorde na posição do cursor
  function handleTextClick(e: React.MouseEvent<HTMLInputElement>) {
    const pos = e.currentTarget.selectionStart ?? 0
    if (pos >= line.text.length) return
    const { lineTop, lineBottom } = getLineBounds()
    openChordSelector({
      tabId,
      blockId,
      sectionId,
      lineId: line.id,
      position: pos,
      anchorX: e.clientX,
      lineTop,
      lineBottom,
    })
  }

  // Qualquer tecla → fecha o seletor e deixa o input funcionar normalmente
  function handleTextKeyDown() {
    closeChordSelector()
  }

  // Mede 1ch a partir do input de texto — mesma fonte e tamanho usados no layout
  function get1ch(): number {
    if (!inputRef.current) return 8.4
    const probe = document.createElement('div')
    probe.style.cssText = `
      position: absolute; visibility: hidden; pointer-events: none;
      font-family: ${getComputedStyle(inputRef.current).fontFamily};
      font-size: ${getComputedStyle(inputRef.current).fontSize};
      width: 1ch;
    `
    document.body.appendChild(probe)
    const w = probe.getBoundingClientRect().width
    document.body.removeChild(probe)
    return w || 8.4
  }

  // Arrastar acorde: posição absoluta relativa à camada, snap por 1ch.
  // Detecta clique vs drag no mouseup — o overlay captura mouseup antes do click event.
  function handleChordMouseDown(e: React.MouseEvent, chord: ChordPosition) {
    e.preventDefault()
    e.stopPropagation()

    const chWidth = get1ch()
    const startX = e.clientX
    const startY = e.clientY
    const anchorX = e.clientX
    let dragged = false

    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;cursor:grabbing;user-select:none'
    document.body.appendChild(overlay)

    function onMouseMove(ev: MouseEvent) {
      const dx = Math.abs(ev.clientX - startX)
      const dy = Math.abs(ev.clientY - startY)
      if (!dragged && dx < 4 && dy < 4) return
      dragged = true
      if (!chordLayerRef.current) return
      const layerLeft = chordLayerRef.current.getBoundingClientRect().left
      const col = Math.floor((ev.clientX - layerLeft) / chWidth)

      // Limita pelo lado direito da coluna: o acorde pode avançar até metade do gap (12px)
      const HALF_GAP = 12
      const colBound = chordLayerRef.current.closest('[data-col-bound]')
      let maxPos = Infinity
      if (colBound) {
        const boundRight = colBound.getBoundingClientRect().right + HALF_GAP
        maxPos = Math.floor((boundRight - layerLeft) / chWidth) - chord.value.length
      }

      const newPos = Math.max(0, Math.min(col, maxPos))
      updateChord(tabId, blockId, sectionId, line.id, { ...chord, position: newPos })
    }

    function onMouseUp() {
      document.body.removeChild(overlay)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      if (!dragged) {
        // foi clique — abre seletor para editar o acorde
        const { lineTop, lineBottom } = getLineBounds()
        openChordSelector({
          tabId,
          blockId,
          sectionId,
          lineId: line.id,
          position: chord.position,
          existingChordId: chord.id,
          anchorX,
          lineTop,
          lineBottom,
        })
      }
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newText = e.target.value
    const oldText = line.text
    const selStart = e.target.selectionStart ?? newText.length

    let newChords = [...line.chords]
    if (newText.length > oldText.length) {
      const insertCount = newText.length - oldText.length
      newChords = shiftChordsOnInsert(newChords, selStart - insertCount, insertCount)
    } else if (newText.length < oldText.length) {
      const deleteCount = oldText.length - newText.length
      newChords = shiftChordsOnDelete(newChords, selStart, deleteCount)
    }

    updateLine(tabId, blockId, sectionId, { ...line, text: newText, chords: newChords })
  }

  const sortedChords = [...line.chords].sort((a, b) => a.position - b.position)

  return (
    <div className="relative">
      {/* Destaque de linha nova — vai exatamente até a posição da régua em movimento */}
      {previewPos !== undefined && line.continuation && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${line.text.length}ch`,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-size, 14px)',
            background: 'rgba(99,102,241,0.10)',
            borderLeft: '2px solid rgba(99,102,241,0.6)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}
      {/* Camada de acordes — herda --chord-size do canvas para 1ch consistente */}
      <div
        ref={chordLayerRef}
        className="relative select-none pointer-events-none"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-size, 14px)',
          whiteSpace: 'pre',
          lineHeight: 1.5,
        }}
      >
        {sortedChords.map(chord => {
          const outOfKey = highlightOutOfKey && activeSongKey
            ? !isChordInKey(chord.value, activeSongKey)
            : false
          return (
            <span
              key={chord.id}
              onMouseDown={e => handleChordMouseDown(e, chord)}
              onMouseEnter={e => handleChordMouseEnter(e, chord)}
              onMouseLeave={handleChordMouseLeave}
              style={{ left: `calc(${chord.position} * 1ch)`, pointerEvents: 'auto' }}
              className="absolute top-0 inline-block cursor-grab active:cursor-grabbing"
            >
              <span
                style={{ fontSize: 'var(--chord-size, 14px)', color: chordColor }}
                className="font-bold rounded px-0.5"
              >
                {chord.value}
              </span>
              {outOfKey && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    left: '0.125rem',
                    right: '0.125rem',
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: '#f59e0b',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </span>
          )
        })}
        {/* Linha fantasma para garantir altura mesmo sem acordes */}
        &nbsp;
      </div>

      {/* Chord diagram popup */}
      {popup && (
        <ChordPopup
          chordValue={popup.chord.value}
          anchorRect={popup.rect}
          onClose={() => setPopup(null)}
        />
      )}

      {/* Texto — clique abre seletor, qualquer tecla fecha e edita normalmente */}
      <input
        ref={inputRef}
        type="text"
        value={line.text}
        onChange={previewPos !== undefined ? undefined : handleTextChange}
        onClick={previewPos !== undefined ? undefined : handleTextClick}
        onKeyDown={previewPos !== undefined ? undefined : handleTextKeyDown}
        readOnly={previewPos !== undefined}
        className="bg-transparent border-none outline-none text-zinc-800 block"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-size, 14px)',
          whiteSpace: 'pre',
          caretColor: '#6366f1',
          lineHeight: 1.5,
          minWidth: '100%',
          width: `${Math.max(1, line.text.length)}ch`,
        }}
        spellCheck={false}
      />
    </div>
  )
}
