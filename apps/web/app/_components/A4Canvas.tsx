'use client'

import { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react'
import { useEditor } from '../_context/EditorContext'
import { Block, EditorTab, Line } from '../_lib/types'
import BlockView from './BlockView'
import ToolsPanel, { MetronomeWidget } from './ToolsPanel'
import ChordChartView from './ChordChartView'
import { IconClipboard, IconImport, IconEdit, IconPlus, IconChevronDown } from '@/components/ui/icons'

// ─── Tela inicial — exibida quando não há abas abertas ───────────────────────

const RECENT_CLOSED_KEY = 'cifra-recent-tabs'

type RecentSong    = { songId: string; title: string; artist: string; isPublished: boolean; hasDraft: boolean }
type RecentClosed  = EditorTab & { closedAt: number }

type ListItem =
  | { kind: 'local'; tab: RecentClosed }
  | { kind: 'db';    song: RecentSong }

// ─── Colar Cifra ────────────────────────────────────────────────────────────

function PasteCifraCard({ onImport }: { onImport: (blocks: unknown[], title: string) => void }) {
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [open,    setOpen]    = useState(false)

  async function handleImport() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/parse-cifra-text', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao importar'); return }
      if (!data.blocks?.length) { setError('Não foi possível reconhecer o formato.'); return }
      onImport(data.blocks, data.title ?? 'Cifra colada')
    } catch {
      setError('Erro de rede. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-raised border border-line">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-surface text-muted">
          <IconClipboard size={15} />
        </div>
        <div>
          <p className="text-sm font-bold text-ink">Colar Cifra</p>
          <p className="text-[10px] text-muted">Formato texto (CifraClub, BananaCifras…)</p>
        </div>
        <button
          onClick={() => setOpen(v => !v)}
          className="ml-auto text-xs text-muted hover:text-ink transition-colors px-2 py-1 rounded hover:bg-surface"
        >
          {open ? 'Fechar' : 'Colar'}
        </button>
      </div>

      {!open && (
        <p className="text-xs text-muted leading-relaxed">
          Tem uma cifra salva em formato texto? Cole aqui e o app converte automaticamente —
          blocos, acordes, letras e tablaturas são reconhecidos.
        </p>
      )}

      {open && (
        <>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setError(null) }}
            placeholder={`Cole a cifra aqui.\nExemplo:\n\nAnunciação\nAlceu Valença\n\n[Intro] G  Am  C\n\nNa bruma leve das paixões\n           Am\nQue vêm de dentro`}
            rows={10}
            className="w-full rounded-xl px-3 py-2.5 text-xs font-mono resize-y outline-none transition-colors"
            style={{
              background: 'var(--ml-surface)',
              border: '1.5px solid var(--ml-line)',
              color: 'var(--ml-ink)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--ml-accent)')}
            onBlur={e  => (e.currentTarget.style.borderColor = 'var(--ml-line)')}
          />
          {error && (
            <p className="text-xs text-red-500 px-1">{error}</p>
          )}
          <button
            onClick={handleImport}
            disabled={!text.trim() || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' }}
          >
            {loading ? (
              <span className="animate-pulse">Importando…</span>
            ) : (
              <>
                <IconImport size={13} />
                Importar Cifra
              </>
            )}
          </button>
        </>
      )}
    </div>
  )
}

// ─── Tela inicial — exibida quando não há abas abertas ───────────────────────

function EditorStartScreen() {
  const { importInNewTab, addTab } = useEditor()
  const [dbSongs, setDbSongs]       = useState<RecentSong[]>([])
  const [dbLoading, setDbLoading]   = useState(true)
  const [openingId, setOpeningId]   = useState<string | null>(null)
  const [recentLocal, setRecentLocal] = useState<RecentClosed[]>([])

  // Lê tabs recentes do localStorage (client-only), limpando duplicatas legadas
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_CLOSED_KEY)
      if (!raw) return
      const list: RecentClosed[] = JSON.parse(raw)
      const seen = new Set<string>()
      const deduped = list.filter(tab => {
        const key = tab.dbSongId ?? tab.name.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      if (deduped.length !== list.length) {
        localStorage.setItem(RECENT_CLOSED_KEY, JSON.stringify(deduped))
      }
      setRecentLocal(deduped)
    } catch { /* ignora */ }
  }, [])

  useEffect(() => {
    fetch('/api/user/songs')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setDbSongs(data) })
      .catch(() => {})
      .finally(() => setDbLoading(false))
  }, [])

  // Mescla locais + DB, deduplicando por dbSongId; ordena por closedAt / lastSeen
  const items = useMemo<ListItem[]>(() => {
    // Dedup dentro do recentLocal (pode conter duplicatas de sessões anteriores)
    const seen = new Set<string>()
    const dedupedLocal = recentLocal.filter(tab => {
      const key = tab.dbSongId ?? tab.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    const localDbIds = new Set(dedupedLocal.map(t => t.dbSongId).filter(Boolean))
    const dbFiltered = dbSongs.filter(s => !localDbIds.has(s.songId))
    const locals: ListItem[] = dedupedLocal.map(tab => ({ kind: 'local', tab }))
    const dbs:    ListItem[] = dbFiltered.slice(0, Math.max(0, 8 - locals.length)).map(song => ({ kind: 'db', song }))
    return [...locals, ...dbs]
  }, [recentLocal, dbSongs])

  // Abre uma tab local (bloco já em memória)
  function openLocal(tab: RecentClosed) {
    if (openingId) return
    setOpeningId(tab.id)
    try {
      importInNewTab(tab.blocks, tab.name, tab.syncData, {
        dbSongId:      tab.dbSongId,
        readOnly:      tab.readOnly,
        arrangement:   tab.arrangement,
        chordOverrides: tab.chordOverrides,
        extraChords:   tab.extraChords,
        loopMarkers:   tab.loopMarkers,
      })
    } finally {
      setOpeningId(null)
    }
  }

  // Abre uma song do banco (busca conteúdo via API)
  async function openDbSong(song: RecentSong) {
    if (openingId) return
    setOpeningId(song.songId)
    try {
      const res  = await fetch(`/api/songs/${song.songId}/content`)
      const data = await res.json()
      if (data.blocks?.length) {
        const syncData = data.syncMeta ? {
          bpm: data.syncMeta.bpm ?? 120,
          beatsPerBar: data.syncMeta.beatsPerBar ?? 4,
          offsetSeconds: data.syncMeta.offsetSeconds ?? 0,
        } : undefined
        importInNewTab(data.blocks, data.title ?? song.title, syncData, {
          dbSongId:      song.songId,
          readOnly:      !!data.isPublished,
          arrangement:   data.arrangement    ?? undefined,
          chordOverrides: data.chordOverrides ?? undefined,
          extraChords:   data.extraChords     ?? undefined,
          loopMarkers:   data.loopMarkers     ?? undefined,
        })
      }
    } catch { /* silencioso */ } finally {
      setOpeningId(null)
    }
  }

  const isLoading = dbLoading && recentLocal.length === 0
  const hasItems  = items.length > 0 || dbLoading

  return (
    <>
    <div className="flex-1 overflow-y-auto flex items-start justify-center py-12 px-8">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        {/* Header */}
        <div className="text-center">
          <p className="text-2xl font-bold text-ink tracking-tight">Editor</p>
          <p className="text-sm text-muted mt-1">Como você quer criar sua cifra?</p>
        </div>

        {/* ── Nova cifra ── */}
        <div className="grid grid-cols-1 gap-4">

          {/* Cifra Manual */}
          <div className="flex flex-col gap-4 p-5 rounded-2xl bg-raised border border-line">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-accent"
                style={{ background: 'color-mix(in oklch, var(--ml-accent) 15%, var(--ml-surface))' }}>
                <IconEdit size={15} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">Cifra Manual</p>
                <p className="text-[10px] text-muted">Composição própria ou inédita</p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Para músicas que ainda não existem em streaming —
              composições próprias, ensaios, arranjos originais ou qualquer música inédita.
              Você escreve a cifra do zero no editor.
            </p>

            <div className="mt-auto">
              <button
                onClick={() => addTab()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <IconPlus size={13} />
                Nova Cifra em branco
              </button>
            </div>
          </div>

        </div>

        {/* ── Card 3: Colar Cifra ── */}
        <PasteCifraCard onImport={(blocks, title) => importInNewTab(blocks as never, title)} />

        {/* Recentes */}
        {hasItems && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-[0.14em] px-1">
              Últimas abertas
            </p>

            {isLoading && (
              <div className="flex flex-col gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-surface animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && items.map(item => {
              if (item.kind === 'local') {
                const { tab } = item
                const artist = tab.blocks.find(b => b.type === 'header')
                  ?.sections[0]?.lines.find((l: { text: string }) => l.text)?.text ?? ''
                const isOpening = openingId === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => openLocal(tab)}
                    disabled={!!openingId}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-raised border border-line hover:border-faint transition-all text-left group disabled:opacity-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {tab.name || 'Sem título'}
                      </p>
                      {artist && artist !== tab.name && (
                        <p className="text-xs text-muted truncate">{artist}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!tab.dbSongId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted font-medium border border-line">
                          local
                        </span>
                      )}
                      {tab.readOnly && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color-mix(in_oklch,var(--color-verse)_16%,transparent)] text-verse font-medium border border-[color-mix(in_oklch,var(--color-verse)_35%,transparent)]">
                          publicada
                        </span>
                      )}
                      {isOpening
                        ? <span className="text-xs text-muted">...</span>
                        : <IconChevronDown size={12} className="-rotate-90 text-faint group-hover:text-muted transition-colors" />
                      }
                    </div>
                  </button>
                )
              }

              const { song } = item
              const isOpening = openingId === song.songId
              return (
                <button
                  key={song.songId}
                  onClick={() => openDbSong(song)}
                  disabled={!!openingId}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-raised border border-line hover:border-faint transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {song.title}
                    </p>
                    {song.artist && (
                      <p className="text-xs text-muted truncate">{song.artist}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {song.isPublished && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color-mix(in_oklch,var(--color-verse)_16%,transparent)] text-verse font-medium border border-[color-mix(in_oklch,var(--color-verse)_35%,transparent)]">
                        publicada
                      </span>
                    )}
                    {song.hasDraft && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color-mix(in_oklch,var(--color-bridge)_16%,transparent)] text-bridge font-medium border border-[color-mix(in_oklch,var(--color-bridge)_35%,transparent)]">
                        rascunho
                      </span>
                    )}
                    {isOpening
                      ? <span className="text-xs text-muted">...</span>
                      : <IconChevronDown size={12} className="-rotate-90 text-faint group-hover:text-muted transition-colors" />
                    }
                  </div>
                </button>
              )
            })}
          </div>
        )}

      </div>
    </div>

    </>
  )
}

const ZOOM_MIN = 25
const ZOOM_MAX = 150
const ZOOM_STEP = 25
const ZOOM_PRESETS = [100, 75, 50, 25]

function ZoomControl({ zoom, onChange }: { zoom: number; onChange: (v: number) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  function handlePercentClick() {
    if (clickTimerRef.current) return
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null
      setMenuOpen(v => !v)
    }, 220)
  }

  function handlePercentDblClick() {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
    }
    onChange(100)
    setMenuOpen(false)
  }

  return (
    <div ref={containerRef} className="absolute bottom-4 right-4 z-20">
      <div className="flex items-center bg-white border border-zinc-300 rounded-full shadow-lg overflow-visible">
        <button
          onClick={() => onChange(Math.max(ZOOM_MIN, zoom - ZOOM_STEP))}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-base font-bold rounded-l-full"
        >
          −
        </button>

        <div className="relative">
          <span
            onClick={handlePercentClick}
            onDoubleClick={handlePercentDblClick}
            className="w-12 h-8 flex items-center justify-center text-xs font-mono text-zinc-700 tabular-nums select-none cursor-pointer hover:bg-zinc-50 transition-colors"
            title="Clique para opções · Duplo para 100%"
          >
            {zoom}%
          </span>

          {menuOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-zinc-200 rounded-lg shadow-xl overflow-hidden">
              {ZOOM_PRESETS.map(p => (
                <button
                  key={p}
                  onClick={() => { onChange(p); setMenuOpen(false) }}
                  className={`w-full px-5 py-1.5 text-xs font-mono text-left hover:bg-zinc-100 transition-colors ${zoom === p ? 'font-semibold' : 'text-zinc-700'}`}
                  style={zoom === p ? { color: 'var(--ml-accent)' } : {}}
                >
                  {p}%
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onChange(Math.min(ZOOM_MAX, zoom + ZOOM_STEP))}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-base font-bold rounded-r-full"
        >
          +
        </button>
      </div>
    </div>
  )
}

const PAGE_HEIGHT = 1123
const PX_PER_MM = 794 / 210  // A4: 794px de largura = 210mm

// Régua vertical — arrastar para dentro quebra linhas; arrastar para fora une continuações
function VerticalRuler({
  fromLeft,
  maxChars,
  minDragChars,
  maxDragChars,
  onBreakAt,
  onJoinTo,
  onPreviewChange,
  onCommit,
  onDragPosition,
}: {
  fromLeft: number
  maxChars: number
  minDragChars?: number
  maxDragChars?: number
  onBreakAt?: (position: number) => void
  onJoinTo?: (position: number) => void
  onPreviewChange?: (pos: number | null) => void
  onCommit?: (pos: number) => void
  onDragPosition?: (pos: number | null) => void
}) {
  const rulerRef = useRef<HTMLDivElement>(null)
  const [previewPos, setPreviewPos] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  if (maxChars === 0) return null

  function get1ch(): number {
    if (!rulerRef.current) return 8.4
    const probe = document.createElement('div')
    const cs = getComputedStyle(rulerRef.current)
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;font-family:${cs.fontFamily};font-size:${cs.fontSize};width:1ch;`
    document.body.appendChild(probe)
    const w = probe.getBoundingClientRect().width
    document.body.removeChild(probe)
    return w || 8.4
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const chWidth = get1ch()
    const container = rulerRef.current?.closest('[data-col-bound]') as HTMLElement | null
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const containerLeft = containerRect.left
    const colMinPos = minDragChars ?? 1
    const colMaxPos = maxDragChars ?? Math.floor(containerRect.width / chWidth)
    const startX = e.clientX
    let hasDragged = false

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:col-resize;user-select:none'
    document.body.appendChild(overlay)

    function getPos(clientX: number) {
      const raw = Math.floor((clientX - containerLeft - fromLeft) / chWidth)
      return Math.max(colMinPos, Math.min(raw, colMaxPos))
    }

    function onMouseMove(ev: MouseEvent) {
      // Só considera drag após mover pelo menos meio caractere
      if (!hasDragged && Math.abs(ev.clientX - startX) < chWidth / 2) return
      hasDragged = true
      const pos = getPos(ev.clientX)
      setPreviewPos(pos > 0 && pos !== maxChars ? pos : null)
      onPreviewChange?.(pos > 0 && pos !== maxChars ? pos : null)
      onDragPosition?.(pos > 0 ? pos : null)
    }

    function onMouseUp(ev: MouseEvent) {
      document.body.removeChild(overlay)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      setPreviewPos(null)
      onPreviewChange?.(null)
      onDragPosition?.(null)
      // Clique simples (sem arrastar): ignora completamente
      if (!hasDragged) return
      const pos = getPos(ev.clientX)
      if (pos > 0 && pos < maxChars) onBreakAt?.(pos)
      else if (pos > maxChars) onJoinTo?.(pos)
      onCommit?.(pos)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <>
      {/* Linha visual com área de clique ampla */}
      <div
        ref={rulerRef}
        aria-hidden
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `calc(${fromLeft}px + ${maxChars} * 1ch)`,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-size, 14px)',
          width: 9,
          marginLeft: -4,
          pointerEvents: 'auto',
          cursor: 'col-resize',
          zIndex: 1,
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 3,
            width: 2,
            backgroundImage:
              'repeating-linear-gradient(to bottom, oklch(0.85 0.20 130 / 0.7) 0px, oklch(0.85 0.20 130 / 0.7) 6px, transparent 6px, transparent 10px)',
            pointerEvents: 'none',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 120ms ease',
          }}
        />
      </div>

      {/* Linha fantasma de preview durante o drag */}
      {previewPos !== null && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `calc(${fromLeft}px + ${previewPos} * 1ch)`,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-size, 14px)',
            width: 2,
            backgroundColor: 'oklch(0.85 0.20 130 / 0.5)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}
    </>
  )
}

function MarginGuide({ marginMm, visible }: { marginMm: number; visible: boolean }) {
  if (marginMm <= 0) return null
  const px = Math.round(marginMm * PX_PER_MM)
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: px,
        border: '1.5px dashed oklch(0.85 0.20 130 / 0.45)',
        borderRadius: 2,
        pointerEvents: 'none',
        zIndex: 10,
        boxShadow: `inset 0 0 0 9999px oklch(0.85 0.20 130 / 0.03)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 180ms ease',
      }}
    />
  )
}

// Versão pura de breakLinesAtPosition — calcula preview sem alterar estado
function applyBreakPreview(blocks: Block[], position: number): Block[] {
  if (position <= 0) return blocks
  return blocks.map(b => ({
    ...b,
    sections: b.sections.map(s => {
      if (s.type === 'TAB') return s
      const snappedLines = s.lines.map(l => ({
        ...l,
        chords: l.chords.map(c => {
          if (c.position < l.text.length) return c
          if (c.position <= position) return c
          return { ...c, position: Math.max(position, Math.max(0, l.text.length - 1)) }
        }),
      }))
      const newLines: Line[] = []
      for (const line of snappedLines) {
        let remaining: Line = { ...line }
        while (remaining.text.length > position) {
          const spaceIdx = remaining.text.lastIndexOf(' ', position - 1)
          const breakAt = spaceIdx > 0 ? spaceIdx : position
          const skipSpace = spaceIdx > 0 ? 1 : 0
          const chordOffset = breakAt + skipSpace
          const text1 = remaining.text.slice(0, breakAt)
          const text2 = remaining.text.slice(breakAt + skipSpace)
          const chords1 = remaining.chords
            .filter(c => c.position < breakAt)
            .map(c => ({
              ...c,
              position: c.position + c.value.length > breakAt
                ? Math.max(0, breakAt - c.value.length)
                : c.position,
            }))
          const chords2 = remaining.chords
            .filter(c => c.position >= breakAt)
            .map(c => ({ ...c, position: Math.max(0, c.position - chordOffset) }))
          newLines.push({ ...remaining, text: text1, chords: chords1 })
          remaining = { id: remaining.id + '_p', text: text2, chords: chords2, continuation: true }
        }
        newLines.push(remaining)
      }
      return { ...s, lines: newLines }
    }),
  }))
}

// Versão pura de joinLinesUpToPosition — une linhas de continuação que cabem em position
function applyJoinPreview(blocks: Block[], position: number): Block[] {
  if (position <= 0) return blocks
  return blocks.map(b => ({
    ...b,
    sections: b.sections.map(s => {
      if (s.type === 'TAB') return s
      const result: Line[] = []
      for (const line of s.lines) {
        if (line.continuation && result.length > 0) {
          const prev = result[result.length - 1]
          const sep = prev.text.length > 0 && line.text.length > 0 ? ' ' : ''
          const combined = prev.text + sep + line.text
          if (combined.length <= position) {
            const offset = prev.text.length + sep.length
            result[result.length - 1] = {
              ...prev,
              text: combined,
              chords: [
                ...prev.chords,
                ...line.chords.map(c => ({ ...c, position: c.position + offset })),
              ],
            }
            continue
          }
        }
        result.push(line)
      }
      return { ...s, lines: result }
    }),
  }))
}

// Mirrors TabEditor constants — must stay in sync
const TAB_PREFIX_CH       = 2.5
const TAB_CELL_CH         = 3
const TAB_SUFFIX_CH       = 1
const TAB_SECTION_SEP     = '__TAB_SECTION__'

function tabWidthChars(block: Block): number {
  const tabSection = block.sections.find(s => s.type === 'TAB')
  if (!tabSection) return 0
  const cols = tabSection.lines
  let numCols = 0
  for (const col of cols) {
    if (col.text === TAB_SECTION_SEP) break
    numCols++
  }
  return numCols > 0 ? Math.round(TAB_PREFIX_CH + numCols * TAB_CELL_CH + TAB_SUFFIX_CH) : 0
}

function maxCharsOf(blocks: Block[], textSize: number, chordSize: number) {
  return blocks.reduce((max, b) => {
    return b.sections.reduce((sMax, s) => {
      if (s.type === 'TAB') return Math.max(sMax, tabWidthChars(b))
      return s.lines.reduce((m, l) => {
        const textEnd = l.text.length
        const chordEnd = l.chords.reduce((cm, c) => {
          return Math.max(cm, c.position + c.value.length * (chordSize / textSize))
        }, 0)
        return Math.max(m, textEnd, chordEnd)
      }, sMax)
    }, max)
  }, 0)
}

function paginateLinear(
  headerHeight: number,
  blocks: Block[],
  heights: Map<string, number>,
  contentHeight: number
): Block[][] {
  const available = contentHeight - headerHeight
  const pages: Block[][] = [[]]
  let used = 0
  for (const block of blocks) {
    const h = heights.get(block.id) ?? 0
    if (used + h > available && pages[pages.length - 1].length > 0) {
      pages.push([block])
      used = h
    } else {
      pages[pages.length - 1].push(block)
      used += h
    }
  }
  return pages
}

// Leitura horizontal: balanceia por altura (bloco 1 esq, bloco 2 dir, bloco 3 esq…)
function paginateHorizontal(
  headerHeight: number,
  blocks: Block[],
  heights: Map<string, number>,
  contentHeight: number
): Array<{ left: Block[]; right: Block[] }> {
  const left: Block[] = []
  const right: Block[] = []
  let leftH = 0, rightH = 0
  for (const block of blocks) {
    const h = heights.get(block.id) ?? 0
    if (leftH <= rightH) { left.push(block); leftH += h }
    else { right.push(block); rightH += h }
  }
  const leftPages = paginateLinear(headerHeight, left, heights, contentHeight)
  const rightPages = paginateLinear(headerHeight, right, heights, contentHeight)
  const count = Math.max(leftPages.length, rightPages.length, 1)
  return Array.from({ length: count }, (_, i) => ({
    left: leftPages[i] ?? [],
    right: rightPages[i] ?? [],
  }))
}

// Leitura vertical: preenche coluna esquerda completamente, depois a direita
function paginateVertical(
  headerHeight: number,
  blocks: Block[],
  heights: Map<string, number>,
  contentHeight: number
): Array<{ left: Block[]; right: Block[] }> {
  const available = contentHeight - headerHeight
  const pages: Array<{ left: Block[]; right: Block[] }> = []
  let i = 0

  while (i < blocks.length) {
    const left: Block[] = []
    const right: Block[] = []
    let leftH = 0, rightH = 0

    while (i < blocks.length) {
      const h = heights.get(blocks[i].id) ?? 0
      if (leftH + h > available && left.length > 0) break
      left.push(blocks[i++])
      leftH += h
    }

    while (i < blocks.length) {
      const h = heights.get(blocks[i].id) ?? 0
      if (rightH + h > available && right.length > 0) break
      right.push(blocks[i++])
      rightH += h
    }

    pages.push({ left, right })
  }

  if (pages.length === 0) pages.push({ left: [], right: [] })
  return pages
}

// Régua centralizada no entre-meio das colunas — controla o redimensionamento
function GapRuler({
  totalColWidth,
  gapWidth,
  minSplit,
  maxSplit,
  onDragSplit,
  onCommitSplit,
  onHoverChange,
}: {
  totalColWidth: number
  gapWidth: number
  minSplit: number
  maxSplit: number
  onDragSplit: (split: number) => void
  onCommitSplit: (split: number) => void
  onHoverChange: (hovered: boolean) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const area = ref.current?.closest('[data-two-col-area]') as HTMLElement | null
    if (!area) return
    const areaLeft = area.getBoundingClientRect().left

    // O usuário arrasta o eixo central do gap, não a borda da coluna.
    // Por isso descontamos metade do gap: leftWidth = cursor - areaLeft - gapWidth/2
    function getSplit(clientX: number) {
      return Math.max(minSplit, Math.min(maxSplit, (clientX - areaLeft - gapWidth / 2) / totalColWidth))
    }

    // Feedback imediato ao clicar
    onDragSplit(getSplit(e.clientX))

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:col-resize;user-select:none'
    document.body.appendChild(overlay)

    function onMouseMove(ev: MouseEvent) {
      onDragSplit(getSplit(ev.clientX))
    }

    function onMouseUp(ev: MouseEvent) {
      document.body.removeChild(overlay)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      onCommitSplit(getSplit(ev.clientX))
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div
      ref={ref}
      aria-hidden
      onMouseDown={handleMouseDown}
      onMouseEnter={() => { setIsHovered(true); onHoverChange(true) }}
      onMouseLeave={() => { setIsHovered(false); onHoverChange(false) }}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 9,
        marginLeft: -4,
        cursor: 'col-resize',
        pointerEvents: 'auto',
        zIndex: 5,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 3,
          width: 2,
          backgroundImage:
            'repeating-linear-gradient(to bottom, oklch(0.85 0.20 130 / 0.7) 0px, oklch(0.85 0.20 130 / 0.7) 6px, transparent 6px, transparent 10px)',
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 120ms ease',
        }}
      />
    </div>
  )
}

export default function A4Canvas() {
  const { activeTab, activeTabId, textSize, chordSize, twoColumns, columnFlow, pageMargin, columnGap, isAdjustingMargin, isAdjustingColumnGap, pasteText, breakLinesAtPosition, joinLinesUpToPosition, snapOuterChordsToPosition, importBlocks, hideTabBlocks, setTwoColumns, setHideTabBlocks, setArrangement, addExtraChord, deleteExtraChord, loopMarkers, setLoopMarker, nowPlayingTitle, setTabReadOnly } = useEditor()
  const [blockHeights, setBlockHeights] = useState<Map<string, number>>(new Map())
  const [zoom, setZoom] = useState(100)
  const [viewMode, setViewMode] = useState<'editor' | 'chart' | 'dev'>(activeTab?.defaultView ?? 'dev')

  useEffect(() => {
    if (activeTab?.defaultView) setViewMode(activeTab.defaultView)
  }, [activeTabId]) // eslint-disable-line react-hooks/exhaustive-deps

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<{ url: string; title: string; artist: string }[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewInfo, setPreviewInfo] = useState<{ blockIds: Set<string>; pos: number; isJoin: boolean } | null>(null)
  const [pageColumnSplits, setPageColumnSplits] = useState<Record<number, number>>({})
  const [dragSplit, setDragSplit] = useState<{ pageIndex: number; split: number } | null>(null)
  const [isGapHovered, setIsGapHovered] = useState(false)
  const blockRefs    = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const roMap        = useRef<Map<string, ResizeObserver>>(new Map())
  const prevTwoColumnsRef = useRef(twoColumns)
  const reflowMountedRef  = useRef(false)
  // Congelamos as alturas durante qualquer drag para evitar o ciclo:
  // preview muda altura → ResizeObserver → setBlockHeights → re-render → oscilação
  const isDraggingRef = useRef(false)

  const columnGapPx = Math.round(columnGap * PX_PER_MM)

  // Largura de 1ch na fonte e tamanho atuais — recalculada só quando textSize muda
  const chWidth = useMemo(() => {
    if (typeof document === 'undefined') return 8.4
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;font-family:var(--font-mono,monospace);font-size:${textSize}px;width:1ch;`
    document.body.appendChild(probe)
    const w = probe.getBoundingClientRect().width || 8.4
    document.body.removeChild(probe)
    return w
  }, [textSize])

  // Ctrl/Cmd + scroll → zoom
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoom(prev => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + delta)))
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  // Debounce: busca automática ao digitar (não-URL)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    const q = searchQuery.trim()
    if (!q || /^https?:\/\//.test(q)) { setSearchResults([]); setIsSearching(false); return }
    if (q.length < 2) return
    setIsSearching(true)
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-cifra?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setSearchResults(data.results ?? [])
      } catch { /* silencioso */ }
      finally { setIsSearching(false) }
    }, 400)
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current) }
  }, [searchQuery])

  useLayoutEffect(() => {
    if (!activeTab) return
    // Mescla no mapa existente para que blocos ainda não medidos mantenham a altura anterior.
    // Isso evita que a paginação trate blocos em transição como altura 0 e os empurre todos
    // para uma coluna só enquanto o DOM ainda não reflete o novo content type.
    setBlockHeights(prev => {
      const next = new Map(prev)
      for (const [id, el] of blockRefs.current) {
        if (el && el.isConnected) next.set(id, el.getBoundingClientRect().height)
      }
      // Remove alturas de blocos que não existem mais
      const liveIds = new Set(activeTab.blocks.map(b => b.id))
      for (const id of next.keys()) {
        if (!liveIds.has(id)) next.delete(id)
      }
      return next
    })
  }, [activeTab?.blocks, textSize, chordSize, twoColumns, columnFlow, pageMargin, columnGap])

  // Ao ligar duas colunas: acordes fora do texto são recolhidos para dentro do limite da coluna
  useEffect(() => {
    const wasTwo = prevTwoColumnsRef.current
    prevTwoColumnsRef.current = twoColumns
    if (!twoColumns || wasTwo || !activeTabId || !activeTab) return

    // Mede 1ch com a fonte monospace do app (--font-mono está no <html>, herdado por body)
    const probe = document.createElement('div')
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;font-family:var(--font-mono,monospace);font-size:${textSize}px;width:1ch;`
    document.body.appendChild(probe)
    const chWidth = probe.getBoundingClientRect().width || 8.4
    document.body.removeChild(probe)

    const mPx = Math.round(pageMargin * PX_PER_MM)
    const colWidthPx = (794 - 2 * mPx - columnGapPx) / 2
    const colMaxPos = Math.floor(colWidthPx / chWidth)

    const allBlockIds = activeTab.blocks.map(b => b.id)
    snapOuterChordsToPosition(activeTabId, allBlockIds, colMaxPos)
  }, [twoColumns, activeTabId, activeTab, textSize, pageMargin, snapOuterChordsToPosition])

  // Reflow automático ao mudar tamanho de fonte, margem ou layout de colunas
  useEffect(() => {
    // Ignora a montagem inicial — o conteúdo acabou de chegar e não precisa ser refluxado
    if (!reflowMountedRef.current) {
      reflowMountedRef.current = true
      return
    }
    if (!activeTabId || !activeTab) return

    const mPx = Math.round(pageMargin * PX_PER_MM)
    const colWidthPx = twoColumns
      ? (794 - 2 * mPx - columnGapPx) / 2
      : (794 - 2 * mPx)
    const colMaxChars = Math.floor(colWidthPx / chWidth)

    if (colMaxChars <= 0) return

    const contentBlockIds = activeTab.blocks
      .filter(b => b.type !== 'header')
      .map(b => b.id)

    if (contentBlockIds.length === 0) return

    // Primeiro une (caso fonte tenha diminuído), depois quebra (caso tenha aumentado)
    joinLinesUpToPosition(activeTabId, contentBlockIds, colMaxChars)
    breakLinesAtPosition(activeTabId, contentBlockIds, colMaxChars)
  }, [textSize, pageMargin, twoColumns, columnGap]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      const text = e.clipboardData?.getData('text') ?? ''
      if (text.trim() && activeTabId) {
        pasteText(activeTabId, text)
        setTwoColumns(true)
        setHideTabBlocks(true)
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [activeTabId, pasteText])

  // Quando o drag termina (dragSplit e previewInfo voltam a null), força re-medição
  // de todas as alturas — os blocos podem ter tamanho diferente do preview.
  useLayoutEffect(() => {
    const dragging = dragSplit !== null || previewInfo !== null
    isDraggingRef.current = dragging
    if (!dragging) {
      setBlockHeights(prev => {
        const next = new Map(prev)
        for (const [id, el] of blockRefs.current) {
          if (el && el.isConnected) next.set(id, el.getBoundingClientRect().height)
        }
        return next
      })
    }
  }, [dragSplit, previewInfo])

  if (!activeTab || !activeTabId) return <EditorStartScreen />

  const sorted = activeTab.blocks.slice().sort((a, b) => a.order - b.order)
  const headerBlock = sorted.find(b => b.type === 'header')
  const contentBlocks = sorted.filter(b => b.type !== 'header' && !(hideTabBlocks && b.sections.every(s => s.type === 'TAB')))

  const marginPx = Math.round(pageMargin * PX_PER_MM)
  const contentHeight = PAGE_HEIGHT - marginPx * 2

  const headerHeight = headerBlock ? (blockHeights.get(headerBlock.id) ?? 0) : 0
  const hasContent = contentBlocks.length > 0

  // Medidas em cm para o overlay fixo de cotas durante o arraste da divisão de colunas
  // 794px = 210mm = 21cm (folha A4)
  const dragMeasure = dragSplit !== null ? (() => {
    const totalColW = (794 - 2 * marginPx) - columnGapPx
    const lW = Math.round(totalColW * dragSplit.split)
    const rW = totalColW - lW
    return {
      lW,
      rW,
      lCm: +(lW * 21 / 794).toFixed(1),
      rCm: +(rW * 21 / 794).toFixed(1),
    }
  })() : null

  // Alturas estimadas durante preview — proporcional à variação do número de linhas
  // Permite que a paginação se atualize ao vivo enquanto o usuário arrasta a régua
  const previewHeights: Map<string, number> = (() => {
    if (!previewInfo) return blockHeights
    const affected = contentBlocks.filter(b => previewInfo.blockIds.has(b.id))
    const previewed = previewInfo.isJoin
      ? applyJoinPreview(affected, previewInfo.pos)
      : applyBreakPreview(affected, previewInfo.pos)
    const result = new Map(blockHeights)
    for (let i = 0; i < affected.length; i++) {
      const orig = affected[i]
      const prev = previewed[i]
      const origLines = orig.sections.reduce((n, s) => n + s.lines.length, 0)
      const prevLines = prev.sections.reduce((n, s) => n + s.lines.length, 0)
      if (origLines > 0 && prevLines !== origLines) {
        const h = blockHeights.get(orig.id) ?? 0
        result.set(orig.id, Math.round(h * prevLines / origLines))
      }
    }
    return result
  })()

  const singlePages = !twoColumns
    ? paginateLinear(headerHeight, contentBlocks, previewHeights, contentHeight)
    : null
  const columnPages = twoColumns
    ? (columnFlow === 'vertical'
        ? paginateVertical(headerHeight, contentBlocks, previewHeights, contentHeight)
        : paginateHorizontal(headerHeight, contentBlocks, previewHeights, contentHeight))
    : null

  const pageCount = twoColumns ? (columnPages?.length ?? 1) : (singlePages?.length ?? 1)

  // setRef é chamado pelo React a cada render (arrow function inline = nova referência).
  // Por isso gerenciamos o ResizeObserver aqui: quando o elemento muda (bloco trocou de
  // página, desmontou e remontou), desconectamos o observer antigo e criamos um novo para
  // o elemento corrente.  Isso evita que um element desconectado do DOM reporte altura 0
  // e destrua a paginação em cascata.
  function setRef(id: string, el: HTMLDivElement | null) {
    // Desconecta observer do elemento anterior (se houver)
    roMap.current.get(id)?.disconnect()
    roMap.current.delete(id)

    blockRefs.current.set(id, el)

    if (el) {
      const ro = new ResizeObserver(() => {
        // Ignora elementos desconectados e qualquer drag ativo
        // (preview muda alturas; só atualizamos ao final do drag)
        if (!el.isConnected || isDraggingRef.current) return
        const h = el.getBoundingClientRect().height
        setBlockHeights(prev => {
          if (prev.get(id) === h) return prev
          const next = new Map(prev)
          next.set(id, h)
          return next
        })
      })
      ro.observe(el)
      roMap.current.set(id, ro)
    }
  }

  async function importUrl(url: string) {
    if (!activeTabId) return
    setIsImporting(true); setSearchResults([]); setImportError(null)
    try {
      const res = await fetch(`/api/fetch-cifra?url=${encodeURIComponent(url)}`)
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error ?? 'Erro desconhecido')
      } else {
        importBlocks(activeTabId, data.blocks, data.title, url)
        // Apply parsed arrangement (includes repeatCount from "Nx" section names)
        if (Array.isArray(data.arrangement) && data.arrangement.some((e: { repeatCount: number }) => e.repeatCount > 1)) {
          const entries = data.arrangement.map((e: { blockId: string; repeatCount: number }) => ({
            id: Math.random().toString(36).slice(2, 11),
            blockId: e.blockId,
            repeatCount: e.repeatCount,
          }))
          setArrangement(activeTabId, entries)
        }
        // Loop markers cleared automatically as new entryIds don't match old ones
        setTwoColumns(true); setHideTabBlocks(true)
        setSearchOpen(false); setSearchQuery(''); setImportError(null)
      }
    } catch {
      setImportError('Não foi possível conectar ao servidor.')
    } finally {
      setIsImporting(false)
    }
  }

  function renderBlocks(blocks: Block[], colWidthChars: number, overridePreview?: { pos: number; isJoin: boolean }, isDragging = false) {
    let activePreviewPos: number | undefined
    let isJoin = false

    if (overridePreview !== undefined) {
      activePreviewPos = overridePreview.pos
      isJoin = overridePreview.isJoin
    } else if (previewInfo !== null && blocks.some(b => previewInfo.blockIds.has(b.id))) {
      activePreviewPos = previewInfo.pos
      isJoin = previewInfo.isJoin
    }

    const displayBlocks = activePreviewPos !== undefined
      ? (isJoin ? applyJoinPreview(blocks, activePreviewPos) : applyBreakPreview(blocks, activePreviewPos))
      : blocks

    return displayBlocks.map((displayBlock, i) => (
      <div key={blocks[i].id} ref={el => setRef(blocks[i].id, el)}>
        <BlockView tabId={activeTabId!} block={displayBlock} previewPos={isJoin ? undefined : activePreviewPos} colWidthChars={colWidthChars} isDragging={isDragging} hideTabSections={hideTabBlocks} isFirstContentBlock={i === 0} />
      </div>
    ))
  }

  function renderPageContent(pageIndex: number) {
    if (!hasContent) {
      return null
    }

    if (twoColumns && columnPages) {
      const { left, right } = columnPages[pageIndex]
      const totalColWidth = (794 - 2 * marginPx) - columnGapPx

      // Largura mínima de cada coluna: 7,5 cm = 75 mm
      const minColPx  = Math.round(75 * PX_PER_MM)
      const minSplit  = Math.min(0.5, minColPx / totalColWidth)
      const maxSplit  = 1 - minSplit

      const committedSplit = Math.max(minSplit, Math.min(maxSplit, pageColumnSplits[pageIndex] ?? 0.5))
      const liveSplit = dragSplit?.pageIndex === pageIndex ? dragSplit.split : committedSplit
      const leftWidth = Math.round(totalColWidth * liveSplit)
      const rightWidth = totalColWidth - leftWidth
      // Capacidade real de cada coluna em caracteres — a régua nunca ultrapassa esse limite
      const leftCapChars = Math.floor(leftWidth / chWidth)
      const rightCapChars = Math.floor(rightWidth / chWidth)
      const isDraggingSplit = dragSplit?.pageIndex === pageIndex

      // Posição da régua: calculada a partir do conteúdo de cada coluna (para isJoin no preview)
      const leftRulerPos  = Math.min(maxCharsOf(left,  textSize, chordSize), leftCapChars)
      const rightRulerPos = Math.min(maxCharsOf(right, textSize, chordSize), rightCapChars)

      return (
        <div data-two-col-area className="flex items-start" style={{ position: 'relative' }}>

          {/* Fundo sutil das zonas durante o arraste — as cotas aparecem no overlay fixo */}
          {isDraggingSplit && (
            <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none', zIndex: 8 }}>
              <div style={{ width: leftWidth, flexShrink: 0, background: 'oklch(0.85 0.20 130 / 0.04)', borderRight: '1px solid oklch(0.85 0.20 130 / 0.2)' }} />
              <div style={{ width: columnGapPx, flexShrink: 0 }} />
              <div style={{ flex: 1, background: 'oklch(0.85 0.20 130 / 0.04)', borderLeft: '1px solid oklch(0.85 0.20 130 / 0.2)' }} />
            </div>
          )}

          {/* Coluna esquerda */}
          <div data-col-bound className="min-w-0 relative" style={{ width: leftWidth }}>
            {renderBlocks(left, leftCapChars, isDraggingSplit ? { pos: leftCapChars, isJoin: leftCapChars > leftRulerPos } : undefined, isDraggingSplit)}
          </div>

          {/* Entre-meio — régua de redimensionamento centralizada + chanfro */}
          <div style={{ width: columnGapPx, flexShrink: 0, position: 'relative', alignSelf: 'stretch' }}>
            {/* Chanfro: sempre levemente visível; destaca no hover e no drag */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'oklch(0.85 0.20 130 / 0.08)',
                borderLeft: '1.5px dashed oklch(0.85 0.20 130 / 0.5)',
                borderRight: '1.5px dashed oklch(0.85 0.20 130 / 0.5)',
                opacity: (isAdjustingColumnGap || isDraggingSplit) ? 1 : isGapHovered ? 0.35 : 0,
                transition: 'opacity 180ms ease',
                pointerEvents: 'none',
              }}
            />
            <GapRuler
              totalColWidth={totalColWidth}
              gapWidth={columnGapPx}
              minSplit={minSplit}
              maxSplit={maxSplit}
              onHoverChange={setIsGapHovered}
              onDragSplit={newSplit => setDragSplit({ pageIndex, split: newSplit })}
              onCommitSplit={newSplit => {
                const newLeftW  = Math.round(totalColWidth * newSplit)
                const newRightW = totalColWidth - newLeftW
                const newLeftCap  = Math.floor(newLeftW  / chWidth)
                const newRightCap = Math.floor(newRightW / chWidth)
                setPageColumnSplits(prev => ({ ...prev, [pageIndex]: newSplit }))
                setDragSplit(null)
                const leftIds = left.map(b => b.id)
                if (leftIds.length > 0 && newLeftCap > 0) {
                  joinLinesUpToPosition(activeTabId!, leftIds, newLeftCap)
                  breakLinesAtPosition(activeTabId!, leftIds, newLeftCap)
                }
                const rightIds = right.map(b => b.id)
                if (rightIds.length > 0 && newRightCap > 0) {
                  joinLinesUpToPosition(activeTabId!, rightIds, newRightCap)
                  breakLinesAtPosition(activeTabId!, rightIds, newRightCap)
                }
              }}
            />
          </div>

          {/* Coluna direita */}
          <div data-col-bound className="min-w-0 relative" style={{ width: rightWidth }}>
            {renderBlocks(right, rightCapChars, isDraggingSplit ? { pos: rightCapChars, isJoin: rightCapChars > rightRulerPos } : undefined, isDraggingSplit)}
          </div>
        </div>
      )
    }

    // Coluna única — sem régua; largura = área útil completa da folha
    const pageBlocks = singlePages![pageIndex] ?? []
    const singleColWidthChars = Math.floor((794 - 2 * marginPx) / chWidth)
    return (
      <div data-col-bound className="relative w-full">
        {renderBlocks(pageBlocks, singleColWidthChars)}
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col relative overflow-hidden bg-zinc-200"
      style={{
        '--text-size': `${textSize}px`,
        '--chord-size': `${chordSize}px`,
      } as React.CSSProperties}
    >
      <ToolsPanel />
      <ZoomControl zoom={zoom} onChange={setZoom} />
      <MetronomeWidget />

      {/* ── Seletor de visão — topo esquerdo ── */}
      {activeTab && !activeTab.readOnly && (
        <div className="absolute top-2 left-3 z-20 flex gap-1 select-none">
          {([
            { mode: 'dev',    label: 'Progressões',           icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
                <rect x="3" y="3" width="4" height="14"/><rect x="10" y="7" width="4" height="10"/><rect x="17" y="5" width="4" height="12"/>
              </svg>
            )},
            { mode: 'chart',  label: 'Progressões de Acordes', icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
                <rect x="2" y="3" width="20" height="18"/><path d="M2 9h20M9 9v12"/>
              </svg>
            )},
            { mode: 'editor', label: 'Cifra',                 icon: (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
                <path d="M4 6h16M4 10h12M4 14h8M4 18h6"/>
              </svg>
            )},
          ] as const).map(({ mode, label, icon }) => {
            const active = viewMode === mode
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={label}
                className="flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  padding: '5px 10px',
                  background: active
                    ? (mode === 'dev' ? '#18181b' : 'var(--ml-accent)')
                    : 'rgba(228,228,231,0.85)',
                  color: active
                    ? (mode === 'dev' ? '#a78bfa' : 'var(--ml-accent-ink)')
                    : '#52525b',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.18)' : '0 1px 2px rgba(0,0,0,0.07)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {icon}
                {label}
              </button>
            )
          })}
        </div>
      )}



      {/* Cotas de engenharia — fixas no centro vertical do viewport durante o arraste de coluna */}
      {dragMeasure !== null && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: '50%',
            transform: 'translateY(-50%)',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          {/* Espelha o layout da página escalado pelo zoom atual */}
          <div
            style={{
              width: 794 * zoom / 100,
              paddingInline: marginPx * zoom / 100,
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Cota coluna A */}
            {(['A', 'B'] as const).map((col, i) => {
              const wPx  = (i === 0 ? dragMeasure.lW : dragMeasure.rW) * zoom / 100
              const wCm  = i === 0 ? dragMeasure.lCm : dragMeasure.rCm
              const line = 'oklch(0.85 0.20 130 / 0.5)'
              const tick = 'oklch(0.85 0.20 130 / 0.6)'
              return (
                <>
                  {i === 1 && <div key="gap" style={{ width: columnGapPx * zoom / 100, flexShrink: 0 }} />}
                  <div
                    key={col}
                    style={{ width: wPx, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {/* Tick esquerdo */}
                    <div style={{ width: 2, height: 14, background: tick, flexShrink: 0 }} />
                    {/* Seta esquerda → */}
                    <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${tick}`, flexShrink: 0 }} />
                    {/* Linha esquerda */}
                    <div style={{ flex: 1, height: 1.5, background: line, minWidth: 4 }} />
                    {/* Label */}
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        border: '1px solid oklch(0.85 0.20 130 / 0.3)',
                        borderRadius: 5,
                        padding: '3px 10px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(79,70,229,0.9)', fontFamily: 'monospace', lineHeight: 1, letterSpacing: '0.01em' }}>
                        {wCm.toFixed(1)} cm
                      </span>
                      <span style={{ fontSize: 8.5, color: 'oklch(0.85 0.20 130 / 0.55)', fontFamily: 'monospace', lineHeight: 1, letterSpacing: '0.06em' }}>
                        Col. {col}
                      </span>
                    </div>
                    {/* Linha direita */}
                    <div style={{ flex: 1, height: 1.5, background: line, minWidth: 4 }} />
                    {/* Seta direita ← */}
                    <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: `7px solid ${tick}`, flexShrink: 0 }} />
                    {/* Tick direito */}
                    <div style={{ width: 2, height: 14, background: tick, flexShrink: 0 }} />
                  </div>
                </>
              )
            })}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto flex flex-col items-center pb-8 pt-3 px-4">

        {/* ── Banner de leitura ── */}
        {activeTab && activeTab?.readOnly ? (
          <div className="flex items-center gap-3 mb-2 select-none">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-200 text-zinc-500 text-xs font-semibold">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a5 5 0 100 10A5 5 0 008 1zM3 8a5 5 0 1110 0A5 5 0 013 8z"/>
                <circle cx="8" cy="8" r="2"/>
              </svg>
              Modo leitura
            </div>
            <button
              onClick={() => { setTabReadOnly(activeTabId, false); setViewMode('editor') }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{ background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' }}
            >
              <IconEdit size={11} />
              Editar
            </button>
          </div>
        ) : null}

        {/* ── Botão colar texto — acima da página, só quando vazia ── */}
        {viewMode === 'editor' && !hasContent && (
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText()
                if (text.trim() && activeTabId) pasteText(activeTabId, text)
              } catch { /* fallback: Ctrl+V manual */ }
            }}
            className="mb-3 px-4 py-1.5 text-sm rounded-lg transition-colors shadow-sm"
            style={{ background: 'var(--ml-accent)', color: 'var(--ml-accent-ink)' }}
          >
            Colar texto
          </button>
        )}

        {/* ── Conteúdo ── */}
        {viewMode === 'chart' ? (
          <>
            <ChordChartView zoom={zoom} />
          </>
        ) : (
          <div style={{ zoom: zoom / 100 }} className="flex flex-col items-center w-full select-none">
            {Array.from({ length: pageCount }, (_, pageIndex) => (
              <div key={pageIndex} className="flex flex-col items-center w-full">
                {pageIndex > 0 && (
                  <div className="flex items-center gap-3 w-[794px] py-3 select-none">
                    <div className="flex-1 border-t border-dashed border-zinc-400" />
                    <span className="text-xs text-zinc-500 font-mono px-2 py-0.5 bg-zinc-300 rounded">
                      Página {pageIndex + 1}
                    </span>
                    <div className="flex-1 border-t border-dashed border-zinc-400" />
                  </div>
                )}
                <div
                  className="relative bg-white shadow-2xl rounded-sm shrink-0"
                  style={{ width: 794, minHeight: PAGE_HEIGHT, padding: `${marginPx}px` }}
                >
                  <MarginGuide marginMm={pageMargin} visible={isAdjustingMargin} />
                  {headerBlock && (
                    <div ref={el => setRef(headerBlock.id, el)}>
                      <BlockView tabId={activeTabId} block={headerBlock} />
                    </div>
                  )}
                  {renderPageContent(pageIndex)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
