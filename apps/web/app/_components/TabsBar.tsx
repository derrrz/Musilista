'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useEditor } from '../_context/EditorContext'
import NewSongModal from './NewSongModal'

type ConfirmClose = { tabId: string; tabName: string }

export default function TabsBar() {
  const { tabs, activeTabId, addTab, closeTab, setActiveTab, isTabDirty, saveDraft, nowPlayingTitle, nowPlayingIsPlaying } = useEditor()
  const { data: session } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmClose, setConfirmClose] = useState<ConfirmClose | null>(null)
  const [saving, setSaving] = useState(false)

  function handleNewSong(name: string, artist: string, view: 'editor' | 'chart') {
    addTab(name, view, artist)
    setModalOpen(false)
  }

  function requestClose(tabId: string, tabName: string) {
    if (session && isTabDirty(tabId)) {
      setConfirmClose({ tabId, tabName })
    } else {
      closeTab(tabId)
    }
  }

  async function handleSaveAndClose() {
    if (!confirmClose) return
    setSaving(true)
    await saveDraft(confirmClose.tabId)
    setSaving(false)
    closeTab(confirmClose.tabId)
    setConfirmClose(null)
  }

  function handleCloseWithout() {
    if (!confirmClose) return
    closeTab(confirmClose.tabId)
    setConfirmClose(null)
  }

  return (
    <>
      <div className="flex items-end px-4 pt-2 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <div className="flex items-end gap-0.5 flex-1 min-w-0">
          {tabs.map(tab => {
            const isActive = tab.id === activeTabId
            const dirty = session && isTabDirty(tab.id)
            const normalize = (s: string) => s.trim().toLowerCase()
              .normalize('NFD').replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')
            const matchingIdx = nowPlayingTitle
              ? tabs.findIndex(t => normalize(t.name) === normalize(nowPlayingTitle))
              : -1
            const isPlaying = matchingIdx !== -1 && tabs[matchingIdx].id === tab.id

            return (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group flex items-center gap-1.5 px-3 py-2 rounded-t-lg cursor-pointer select-none flex-1 min-w-0 max-w-[200px]
                  transition-colors border-t border-l border-r
                  ${isActive
                    ? 'bg-white text-zinc-900 border-zinc-300'
                    : 'bg-zinc-600 text-zinc-200 border-zinc-500 hover:bg-zinc-500 hover:text-white'
                  }
                `}
              >
                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isPlaying && nowPlayingIsPlaying && (
                    <svg width="7" height="8" viewBox="0 0 7 8" style={{ flexShrink: 0, fill: 'var(--ml-accent)', animation: 'ml-beat 700ms ease-out infinite' }}>
                      <polygon points="0,0 7,4 0,8" />
                    </svg>
                  )}
                  {isPlaying && !nowPlayingIsPlaying && (
                    <svg width="7" height="8" viewBox="0 0 7 8" style={{ flexShrink: 0, fill: 'var(--ml-accent)' }}>
                      <rect x="0" y="0" width="2.5" height="8" />
                      <rect x="4.5" y="0" width="2.5" height="8" />
                    </svg>
                  )}
                  <span className="text-sm truncate">{tab.name}</span>
                  {dirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Edições não salvas" />
                  )}
                </span>

                <button
                  onClick={e => { e.stopPropagation(); requestClose(tab.id, tab.name) }}
                  className={`
                    ml-auto shrink-0 w-4 h-4 rounded flex items-center justify-center text-xs
                    transition-opacity
                    ${isActive ? 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200' : 'text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100'}
                  `}
                >
                  ×
                </button>
              </div>
            )
          })}

          <button
            onClick={() => setModalOpen(true)}
            className="mb-0.5 ml-1 w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-600 transition-colors text-lg leading-none"
            title="Nova música"
          >
            +
          </button>
        </div>
      </div>

      {/* Modal de confirmação de fechar aba com edições */}
      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4">
            <div>
              <p className="text-white font-semibold text-sm">Salvar rascunho?</p>
              <p className="text-zinc-400 text-xs mt-1">
                <span className="text-zinc-200">{confirmClose.tabName}</span> tem edições não salvas. Deseja salvar o rascunho antes de fechar?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleSaveAndClose}
                disabled={saving}
                className="w-full py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando…' : 'Salvar e fechar'}
              </button>
              <button
                onClick={handleCloseWithout}
                disabled={saving}
                className="w-full py-2 text-sm rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors disabled:opacity-50"
              >
                Fechar sem salvar
              </button>
              <button
                onClick={() => setConfirmClose(null)}
                disabled={saving}
                className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <NewSongModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={(name, artist, view) => handleNewSong(name, artist, view)}
      />
    </>
  )
}
