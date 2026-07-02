'use client'

import { useEditor } from '../_context/EditorContext'
import { generateId } from '../_lib/utils'
import ChordPickerPopover from './ChordPickerPopover'

export default function ChordSelector() {
  const { chordSelector, closeChordSelector, insertChord, updateChord, removeChord } = useEditor()

  if (!chordSelector) return null

  const isEditing = Boolean(chordSelector.existingChordId)

  function handleConfirm(chord: string) {
    const chordObj = {
      id:       chordSelector!.existingChordId ?? generateId(),
      value:    chord,
      position: chordSelector!.position,
    }
    if (chordSelector!.existingChordId) {
      updateChord(
        chordSelector!.tabId, chordSelector!.blockId,
        chordSelector!.sectionId, chordSelector!.lineId, chordObj,
      )
    } else {
      insertChord(
        chordSelector!.tabId, chordSelector!.blockId,
        chordSelector!.sectionId, chordSelector!.lineId, chordObj,
      )
    }
    closeChordSelector()
  }

  function handleRemove() {
    if (!chordSelector?.existingChordId) return
    removeChord(
      chordSelector.tabId, chordSelector.blockId,
      chordSelector.sectionId, chordSelector.lineId,
      chordSelector.existingChordId,
    )
    closeChordSelector()
  }

  return (
    <ChordPickerPopover
      anchorX={chordSelector.anchorX}
      lineTop={chordSelector.lineTop}
      lineBottom={chordSelector.lineBottom}
      isEditing={isEditing}
      onConfirm={handleConfirm}
      onRemove={isEditing ? handleRemove : undefined}
      onClose={closeChordSelector}
    />
  )
}
