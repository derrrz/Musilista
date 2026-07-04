'use client'

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { IconChordGrid, IconDocument } from '@/components/ui/icons'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: (name: string, artist: string, view: 'editor' | 'chart') => void
}

export default function NewSongModal({ open, onClose, onConfirm }: Props) {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName('')
      setArtist('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function handleConfirm(view: 'editor' | 'chart') {
    onConfirm(name.trim() || 'Sem título', artist.trim(), view)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={onClose}
    >
      <div
        className="bg-raised border border-line rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col gap-6"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink leading-tight">Nova música</h2>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Título da música"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Input
            type="text"
            placeholder="Nome do artista"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[10px] text-faint font-medium uppercase tracking-[0.14em]">Por onde quer começar?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirm('chart')}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-line px-4 py-4 text-sm font-medium text-muted hover:border-faint hover:text-ink transition-colors"
            >
              <IconChordGrid size={24} />
              Progressões
            </button>
            <button
              onClick={() => handleConfirm('editor')}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-line px-4 py-4 text-sm font-medium text-muted hover:border-faint hover:text-ink transition-colors"
            >
              <IconDocument size={24} />
              Cifra
            </button>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onClose} className="self-center">
          Cancelar
        </Button>
      </div>
    </div>
  )
}
