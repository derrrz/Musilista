'use client'

import { useEffect, useRef, useState } from 'react'

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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col gap-6"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-zinc-900 leading-tight">Nova música</h2>
        </div>

        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            placeholder="Título da música"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition-colors"
          />
          <input
            type="text"
            placeholder="Nome do artista"
            value={artist}
            onChange={e => setArtist(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-400 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wide">Por onde quer começar?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirm('chart')}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 px-4 py-4 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
              Progressões
            </button>
            <button
              onClick={() => handleConfirm('editor')}
              className="flex-1 flex flex-col items-center gap-2 rounded-xl border-2 border-zinc-200 px-4 py-4 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Cifra
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors self-center"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
