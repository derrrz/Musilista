'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useEditor } from '../_context/EditorContext'
import NewSongModal from './NewSongModal'
import { Button } from '@/components/ui/Button'
import { IconClose, IconPlus, IconPlay, IconPause } from '@/components/ui/icons'

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
      <div className="flex items-end px-4 pt-2 bg-surface border-b border-line shrink-0">
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
                    ? 'bg-bg text-ink border-line'
                    : 'bg-transparent text-muted border-transparent hover:bg-raised hover:text-ink'
                  }
                `}
              >
                <span className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isPlaying && nowPlayingIsPlaying && (
                    <IconPlay size={9} className="shrink-0 text-accent" style={{ animation: 'ml-beat 700ms ease-out infinite' }} />
                  )}
                  {isPlaying && !nowPlayingIsPlaying && (
                    <IconPause size={9} className="shrink-0 text-accent" />
                  )}
                  <span className="text-sm truncate">{tab.name}</span>
                  {dirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-bridge shrink-0" title="Edições não salvas" />
                  )}
                </span>

                <button
                  onClick={e => { e.stopPropagation(); requestClose(tab.id, tab.name) }}
                  className={`
                    ml-auto shrink-0 w-4 h-4 rounded flex items-center justify-center
                    transition-opacity
                    ${isActive ? 'text-faint hover:text-ink hover:bg-raised' : 'text-faint hover:text-ink opacity-0 group-hover:opacity-100'}
                  `}
                >
                  <IconClose size={10} />
                </button>
              </div>
            )
          })}

          <button
            onClick={() => setModalOpen(true)}
            className="mb-0.5 ml-1 w-7 h-7 flex items-center justify-center rounded text-muted hover:text-ink hover:bg-raised transition-colors"
            title="Nova música"
          >
            <IconPlus size={14} />
          </button>
        </div>
      </div>

      {/* Modal de confirmação de fechar aba com edições */}
      {confirmClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-raised border border-line rounded-xl shadow-2xl p-6 w-80 flex flex-col gap-4">
            <div>
              <p className="text-ink font-semibold text-sm">Salvar rascunho?</p>
              <p className="text-muted text-xs mt-1">
                <span className="text-ink">{confirmClose.tabName}</span> tem edições não salvas. Deseja salvar o rascunho antes de fechar?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={handleSaveAndClose} disabled={saving} className="w-full">
                {saving ? 'Salvando…' : 'Salvar e fechar'}
              </Button>
              <Button variant="outline" onClick={handleCloseWithout} disabled={saving} className="w-full">
                Fechar sem salvar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClose(null)} disabled={saving} className="w-full">
                Cancelar
              </Button>
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
