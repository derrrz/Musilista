'use client'

import { useMemo, useState } from 'react'
import { useEditor } from '../_context/EditorContext'
import { useSequenceEngine } from './useSequenceEngine'
import { BARS_PER_ROW } from './arrangement'

/**
 * Motor compartilhado de progressões de acordes.
 *
 * Encapsula toda a lógica de dados e mutações de acordes/arranjo
 * que é comum entre ProgressoesDevView e ChordChartView.
 * Cada view chama este hook e recebe dados + ações prontas;
 * a UI (animações, player, grid compacto vs espaçado) fica em cada view.
 *
 * Invariantes:
 * - Toda mutação passa por useEditor() → undo/redo e autosave garantidos.
 * - Fita de chips (SimulatedPlayer/ChipStrip) e animações faixa (useSyncClock)
 *   ficam nas views, não aqui.
 * - ChordPickerPopover é o único picker de acorde usado por qualquer view.
 */
export function useProgressionEngine() {
  const {
    activeTab, activeTabId,
    setChordOverride,
    setAllChordOverrides,
    setAllExtraChords,
    addExtraChord,
    deleteExtraChord,
    setArrangement,
    loopMarkers,
  } = useEditor()

  const chordOverrides = activeTab?.chordOverrides ?? {}
  const extraChords    = activeTab?.extraChords    ?? {}

  const engine = useSequenceEngine(
    activeTab?.blocks ?? [],
    activeTab?.arrangement,
    loopMarkers,
    chordOverrides,
    extraChords,
  )

  const { effectiveArr, sections } = engine

  // ── UI state shared across both progression views ───────────────────────────
  const [passIndex,    setPassIndex]    = useState<0 | 1 | 2>(0)
  const [showDiagrams, setShowDiagrams] = useState(false)

  // ── Bar numbers: barKey → sequential compasso number (1-based) ──────────────
  const barNumbers = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    let global = 1
    for (const sec of sections) {
      if (sec.passIndex !== 0) continue
      const bpc        = sec.barsPerCell ?? 1
      const totalCells = sec.cells.length + (sec.addedCells ?? 0)
      for (let ci = 0; ci < totalCells; ci++) {
        result[`${sec.entryId}:${ci}`] = global
        global += bpc
      }
    }
    return result
  }, [sections])

  // ── Display chords: original + override + extras merged ─────────────────────
  function getDisplayChords(barKey: string): string[] {
    const [entryId, ciStr] = barKey.split(':')
    const ci  = parseInt(ciStr, 10)
    const sec = sections.find(s => s.entryId === entryId)
    const ov  = chordOverrides[barKey]
    if (ov !== undefined) return ov
    const original = sec ? (sec.cells[ci] ?? []).flat() : []
    return [...original, ...(extraChords[barKey] ?? [])]
  }

  // ── moveChord: drag-and-drop between cells ──────────────────────────────────
  function moveChord(srcKey: string, srcIdx: number, destKey: string, insertIdx: number, copy = false) {
    const srcDisplay = getDisplayChords(srcKey)
    if (srcIdx < 0 || srcIdx >= srcDisplay.length) return
    const movedChord = srcDisplay[srcIdx]

    if (srcKey === destKey) {
      const next = [...srcDisplay]
      next.splice(srcIdx, 1)
      const adj = insertIdx > srcIdx ? insertIdx - 1 : insertIdx
      next.splice(adj, 0, movedChord)
      if (JSON.stringify(next) === JSON.stringify(srcDisplay)) return
      setChordOverride(activeTabId, srcKey, next)
    } else {
      const destDisplay = getDisplayChords(destKey)
      const newDest     = [...destDisplay]
      newDest.splice(insertIdx, 0, movedChord)
      if (!copy) {
        setChordOverride(activeTabId, srcKey, srcDisplay.filter((_, i) => i !== srcIdx))
      }
      setChordOverride(activeTabId, destKey, newDest)
    }
  }

  // ── batchClearEntry: remove all overrides+extras for one entry ──────────────
  function batchClearEntry(entryId: string) {
    const prefix = `${entryId}:`
    const newOv: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(chordOverrides)) {
      if (!k.startsWith(prefix)) newOv[k] = v
    }
    const newEx: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(extraChords)) {
      if (!k.startsWith(prefix)) newEx[k] = v
    }
    setAllChordOverrides(activeTabId, Object.keys(newOv).length ? newOv : undefined)
    setAllExtraChords(activeTabId, Object.keys(newEx).length ? newEx : undefined)
  }

  // ── addCell: append one extra row to an entry ───────────────────────────────
  function addCell(entryId: string) {
    setArrangement(activeTabId, effectiveArr.map(e =>
      e.id === entryId ? { ...e, addedCells: (e.addedCells ?? 0) + BARS_PER_ROW } : e
    ))
  }

  // ── setMirrorName: name for the p2 compact section ──────────────────────────
  function setMirrorName(entryId: string, name: string) {
    setArrangement(activeTabId, effectiveArr.map(e =>
      e.id === entryId ? { ...e, mirrorName: name || undefined } : e
    ))
  }

  // ── setLoopBack: connect end of entry to another entry ──────────────────────
  function setLoopBack(entryId: string, targetId: string | null) {
    setArrangement(activeTabId, effectiveArr.map(e =>
      e.id === entryId
        ? { ...e, loopBackToEntryId: targetId ?? undefined, groupProgressions: targetId ? e.groupProgressions : false }
        : e
    ))
  }

  // ── Convenience wrappers (drop tabId from signature for callers) ─────────────
  function overrideChord(key: string, chords: string[] | undefined) {
    setChordOverride(activeTabId, key, chords as string[])
  }
  function addExtra(key: string, chord: string) {
    addExtraChord(activeTabId, key, chord)
  }
  function deleteExtra(key: string, idx: number) {
    deleteExtraChord(activeTabId, key, idx)
  }

  return {
    // ── Engine data (from useSequenceEngine) ────────────────────────────────
    ...engine,
    // ── Raw chord data ──────────────────────────────────────────────────────
    chordOverrides,
    extraChords,
    loopMarkers,
    // ── Derived ─────────────────────────────────────────────────────────────
    barNumbers,
    getDisplayChords,
    // ── Chord mutations ─────────────────────────────────────────────────────
    overrideChord,
    addExtra,
    deleteExtra,
    moveChord,
    batchClearEntry,
    // ── Arrangement mutations ────────────────────────────────────────────────
    addCell,
    setMirrorName,
    setLoopBack,
    // ── UI state ─────────────────────────────────────────────────────────────
    passIndex,
    setPassIndex,
    showDiagrams,
    setShowDiagrams,
  }
}

export type ProgressionEngine = ReturnType<typeof useProgressionEngine>
