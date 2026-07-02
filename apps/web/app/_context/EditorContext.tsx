'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  ReactNode,
} from 'react'
import { EditorTab, Block, Line, ChordPosition, ChordSelectorState, CustomBlockType, Section, SectionType, SyncData, ArrangementEntry, FilledBar, LoopMarker } from '../_lib/types'
import { parseTextToBlocks, generateId, createSection, migrateBlock } from '../_lib/utils'
import { barIndexToMs, extractBarsFromBlock, detectArrangement, mergedBarsForSection } from '../_lib/arrangement'
import { transposeChord, transposeKey, preferFlats } from '../_lib/harmony'
import { extractSongMeta, songSlug } from '../_lib/songMeta'
import { useSession } from 'next-auth/react'

// ─── Autosave ─────────────────────────────────────────────────────────────────

const STORAGE_KEY      = 'musilista-state'
const RECENT_CLOSED_KEY = 'musilista-recent-tabs'
const RECENT_MAX        = 8
const HISTORY_MAX       = 50

type PersistedState = {
  tabs: EditorTab[]
  activeTabId: string
  textSize: number
  chordSize: number
  chordColor: string
  twoColumns: boolean
  columnFlow: 'horizontal' | 'vertical'
  pageMargin: number
  columnGap: number
  blockGap: number
  hideUnnamedBlocks: boolean
  hideTabBlocks: boolean
  highlightOutOfKey: boolean
  showBeatDot: boolean
  showSyncTools: boolean
  animPrefs: { barra: boolean; cobrinha: boolean; solido: boolean }
}

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (parsed.tabs) parsed.tabs = parsed.tabs.map(t => ({ ...t, blocks: t.blocks.map(migrateBlock) }))
    return parsed
  } catch { return {} }
}

function stripVolatileSync(tab: EditorTab): EditorTab {
  if (!tab.syncData) return tab
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { extProgressMs, extProgressAt, extIsPlaying, ...syncRest } = tab.syncData
  return { ...tab, syncData: syncRest }
}

type EditorContextValue = {
  tabs: EditorTab[]
  activeTabId: string
  activeTab: EditorTab | undefined
  chordSelector: ChordSelectorState
  textSize: number
  chordSize: number
  chordColor: string
  twoColumns: boolean
  columnFlow: 'horizontal' | 'vertical'
  pageMargin: number
  columnGap: number
  isAdjustingMargin: boolean
  isAdjustingColumnGap: boolean
  setIsAdjustingMargin: (v: boolean) => void
  setIsAdjustingColumnGap: (v: boolean) => void
  setTextSize: (size: number) => void
  setChordSize: (size: number) => void
  setChordColor: (color: string) => void
  setTwoColumns: (v: boolean) => void
  setColumnFlow: (v: 'horizontal' | 'vertical') => void
  setPageMargin: (v: number) => void
  setColumnGap: (v: number) => void
  blockGap: number
  setBlockGap: (v: number) => void
  addTab: (name?: string, defaultView?: 'editor' | 'chart', artist?: string) => string
  closeTab: (tabId: string) => void
  isTabDirty: (tabId: string) => boolean
  saveDraft: (tabId?: string) => Promise<boolean>
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, name: string) => void
  pasteText: (tabId: string, text: string) => void
  updateBlock: (tabId: string, block: Block) => void
  removeBlock: (tabId: string, blockId: string) => void
  updateLine: (tabId: string, blockId: string, sectionId: string, line: Line) => void
  insertChord: (tabId: string, blockId: string, sectionId: string, lineId: string, chord: ChordPosition) => void
  updateChord: (tabId: string, blockId: string, sectionId: string, lineId: string, chord: ChordPosition) => void
  removeChord: (tabId: string, blockId: string, sectionId: string, lineId: string, chordId: string) => void
  openChordSelector: (state: ChordSelectorState) => void
  closeChordSelector: () => void
  // Régua vertical — opera em todas as seções de texto (não-TAB) dos blocos especificados
  breakLinesAtPosition: (tabId: string, blockIds: string[], position: number) => void
  joinLinesUpToPosition: (tabId: string, blockIds: string[], position: number) => void
  snapOuterChordsToPosition: (tabId: string, blockIds: string[], position: number) => void
  // Operações de seção
  addSection: (tabId: string, blockId: string, type: SectionType, afterSectionId?: string) => void
  removeSection: (tabId: string, blockId: string, sectionId: string) => void
  updateSection: (tabId: string, blockId: string, section: Section) => void
  removeLine: (tabId: string, blockId: string, sectionId: string, lineId: string) => void
  customBlockTypes: CustomBlockType[]
  saveCustomBlockType: (entry: CustomBlockType) => void
  removeCustomBlockType: (name: string) => void
  hideUnnamedBlocks: boolean
  setHideUnnamedBlocks: (v: boolean) => void
  hideTabBlocks: boolean
  setHideTabBlocks: (v: boolean) => void
  highlightOutOfKey: boolean
  setHighlightOutOfKey: (v: boolean) => void
  showBeatDot: boolean
  setShowBeatDot: (v: boolean) => void
  showSyncTools: boolean
  setShowSyncTools: (v: boolean) => void
  animPrefs: { barra: boolean; cobrinha: boolean; solido: boolean }
  setAnimPrefs: (v: { barra: boolean; cobrinha: boolean; solido: boolean }) => void
  activeSongKey: string | undefined
  importBlocks: (tabId: string, blocks: Block[], name?: string, sourceUrl?: string) => void
  importInNewTab: (blocks: Block[], name: string, syncData?: SyncData, opts?: { dbSongId?: string; sourceUrl?: string; readOnly?: boolean; arrangement?: ArrangementEntry[]; chordOverrides?: Record<string, string[]>; extraChords?: Record<string, string[]>; loopMarkers?: Record<string, LoopMarker> }) => string
  resetTabContent: (tabId: string, blocks: Block[], opts?: { name?: string; arrangement?: ArrangementEntry[] }) => void
  setTabReadOnly: (tabId: string, readOnly: boolean) => void
  transposeTab: (tabId: string, semitones: number) => void
  setSyncData: (tabId: string, data: SyncData | undefined) => void
  setArrangement: (tabId: string, entries: ArrangementEntry[] | undefined) => void
  deleteAddedRow: (tabId: string, entryId: string, rowStart: number, rowEnd: number, barsPerRow: number) => void
  addExtraChord: (tabId: string, key: string, chord: string) => void
  deleteExtraChord: (tabId: string, key: string, idx: number) => void
  setChordOverride: (tabId: string, barKey: string, chords: string[] | undefined) => void
  setTimeSigChange: (tabId: string, key: string, timeSig: { num: number; den: number } | null) => void
  setAllChordOverrides: (tabId: string, overrides: Record<string, string[]> | undefined) => void
  setAllExtraChords: (tabId: string, extras: Record<string, string[]> | undefined) => void
  addBlock: (tabId: string, afterBlockId: string) => void
  duplicateBlock: (tabId: string, blockId: string, entryId: string, newBlockId?: string, newEntryId?: string) => void
  splitBlock: (tabId: string, entryId: string, blockId: string, atCellIndex: number) => void
  loopMarkers: Record<string, LoopMarker>
  setLoopMarker: (entryId: string, m: LoopMarker | null) => void
  filledBars: FilledBar[]
  exportActiveTab: () => void
  loadTabFromFile: (file: File) => Promise<void>
  seekToBar: (barIndex: number) => Promise<void>
  publishDraft: () => Promise<'published' | 'pending_review' | null>
  lastPublishedAt: number
  createTabForSong: (title: string, artist: string) => string
  tabsLoaded: boolean
  nowPlayingTitle: string | null
  setNowPlayingTitle: (title: string | null) => void
  nowPlayingIsPlaying: boolean
  setNowPlayingIsPlaying: (playing: boolean) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export const EditorContext = createContext<EditorContextValue | null>(null)

function createEmptyTab(name: string): EditorTab {
  return { id: generateId(), name, blocks: [] }
}

export function EditorProvider({ children }: { children: ReactNode }) {
  // ── Initial state — server-safe defaults (no localStorage reads here) ─────
  const { data: session } = useSession()
  const [tabs, setTabs] = useState<EditorTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [chordSelector, setChordSelector] = useState<ChordSelectorState>(null)
  const [lastPublishedAt, setLastPublishedAt] = useState(0)
  const [textSize, setTextSize] = useState(14)
  const [chordSize, setChordSize] = useState(14)
  const [chordColor, setChordColor] = useState('#4f46e5')
  const [twoColumns, setTwoColumns] = useState(false)
  const [columnFlow, setColumnFlow] = useState<'horizontal' | 'vertical'>('vertical')
  const [pageMargin, setPageMargin] = useState(10)
  const [columnGap, setColumnGap] = useState(6)
  const [blockGap, setBlockGap] = useState(8)
  const [isAdjustingMargin, setIsAdjustingMargin] = useState(false)
  const [isAdjustingColumnGap, setIsAdjustingColumnGap] = useState(false)
  const [hideUnnamedBlocks, setHideUnnamedBlocks] = useState(false)
  const [hideTabBlocks, setHideTabBlocks] = useState(false)
  const [highlightOutOfKey, setHighlightOutOfKey] = useState(false)
  const [showBeatDot, setShowBeatDot] = useState(false)
  const [showSyncTools, setShowSyncTools] = useState(false)
  const [animPrefs, setAnimPrefs] = useState({ barra: true, cobrinha: true, solido: true })
  const [customBlockTypes, setCustomBlockTypes] = useState<CustomBlockType[]>([])
  // Loop markers: ephemeral practice loops por entryId (não persistido em arquivo)
  // loopMarkers vivem dentro do tab ativo para serem persistidos no draft/publish
  const loopMarkersRef = useRef<Record<string, LoopMarker>>({})

  const setLoopMarker = useCallback((entryId: string, m: LoopMarker | null) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t
      const cur = t.loopMarkers ?? {}
      if (m === null) {
        const { [entryId]: _, ...rest } = cur
        return { ...t, loopMarkers: Object.keys(rest).length > 0 ? rest : undefined }
      }
      return { ...t, loopMarkers: { ...cur, [entryId]: m } }
    }))
  }, [activeTabId])

  const [nowPlayingTitle, setNowPlayingTitle] = useState<string | null>(null)
  const [nowPlayingIsPlaying, setNowPlayingIsPlaying] = useState(false)

  // Gate autosave until localStorage has been loaded — prevents overwriting
  // persisted data with the empty default state on first render.
  const [loaded, setLoaded] = useState(false)

  // ── Dirty tracking — ref for fast writes, version for re-renders ─────────────
  const dirtyTabsRef  = useRef<Set<string>>(new Set())
  const [dirtyVersion, setDirtyVersion] = useState(0)

  const markDirty = useCallback((tabId: string) => {
    if (dirtyTabsRef.current.has(tabId)) return
    dirtyTabsRef.current.add(tabId)
    setDirtyVersion(v => v + 1)
  }, [])

  const clearDirty = useCallback((tabId: string) => {
    if (!dirtyTabsRef.current.has(tabId)) return
    dirtyTabsRef.current.delete(tabId)
    setDirtyVersion(v => v + 1)
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isTabDirty = useCallback((_version: number, tabId: string) => dirtyTabsRef.current.has(tabId), [])

  // ── Undo/redo history ────────────────────────────────────────────────────────
  // Refs so mutations never trigger re-renders; historyVersion drives canUndo/canRedo.
  const tabsRef = useRef<EditorTab[]>([])
  const undoStackRef = useRef<Record<string, EditorTab[]>>({})
  const redoStackRef = useRef<Record<string, EditorTab[]>>({})
  const [historyVersion, setHistoryVersion] = useState(0)
  // Debounce consecutive text-line edits into a single undo entry.
  const lastLinePushRef = useRef<{ tabId: string; time: number } | null>(null)

  // ── Load from localStorage after mount ───────────────────────────────────
  useEffect(() => {
    const p = loadPersistedState()
    if (Array.isArray(p.tabs)) {
      // Deduplicate tab IDs (guard against any previously saved bad state)
      const seen = new Set<string>()
      const uniqueTabs = p.tabs.filter(t => !seen.has(t.id) && !!seen.add(t.id))
      setTabs(uniqueTabs)
      const savedId = p.activeTabId
      setActiveTabId(savedId && uniqueTabs.some(t => t.id === savedId) ? savedId : uniqueTabs[0]?.id ?? '')
    }
    if (p.textSize          !== undefined) setTextSize(p.textSize)
    if (p.chordSize         !== undefined) setChordSize(p.chordSize)
    if (p.chordColor        !== undefined) setChordColor(p.chordColor)
    if (p.twoColumns        !== undefined) setTwoColumns(p.twoColumns)
    if (p.columnFlow        !== undefined) setColumnFlow(p.columnFlow)
    if (p.pageMargin        !== undefined) setPageMargin(p.pageMargin)
    if (p.columnGap         !== undefined) setColumnGap(p.columnGap)
    if (p.blockGap          !== undefined) setBlockGap(p.blockGap)
    if (p.hideUnnamedBlocks !== undefined) setHideUnnamedBlocks(p.hideUnnamedBlocks)
    if (p.hideTabBlocks     !== undefined) setHideTabBlocks(p.hideTabBlocks)
    if (p.highlightOutOfKey !== undefined) setHighlightOutOfKey(p.highlightOutOfKey)
    if (p.showBeatDot       !== undefined) setShowBeatDot(p.showBeatDot)
    if (p.showSyncTools     !== undefined) setShowSyncTools(p.showSyncTools)
    if (p.animPrefs         !== undefined) setAnimPrefs(p.animPrefs)
    try {
      const stored = localStorage.getItem('cifra-custom-block-types')
      if (stored) setCustomBlockTypes(JSON.parse(stored))
    } catch { /* ignore */ }
    setLoaded(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Autosave localStorage — debounced 1 s ───────────────────────────────────
  useEffect(() => {
    if (!loaded) return
    const timer = setTimeout(() => {
      try {
        const state: PersistedState = {
          tabs: tabs.map(stripVolatileSync),
          activeTabId,
          textSize, chordSize, chordColor,
          twoColumns, columnFlow, pageMargin, columnGap, blockGap,
          hideUnnamedBlocks, hideTabBlocks, highlightOutOfKey, showBeatDot, showSyncTools,
          animPrefs,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch { /* quota exceeded — ignore */ }
    }, 1000)
    return () => clearTimeout(timer)
  }, [loaded, tabs, activeTabId, textSize, chordSize, chordColor, twoColumns, columnFlow, pageMargin, columnGap, blockGap, hideUnnamedBlocks, hideTabBlocks, highlightOutOfKey, showBeatDot, showSyncTools, animPrefs])

  // Keep tabsRef in sync so pushUndo can read the pre-mutation state.
  useEffect(() => { tabsRef.current = tabs }, [tabs])

  const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId])
  const loopMarkers: Record<string, LoopMarker> = activeTab?.loopMarkers ?? {}
  loopMarkersRef.current = loopMarkers
  const activeSongKey = activeTab?.blocks.find(b => b.type === 'header')?.songKey

  const saveDraft = useCallback(async (tabId?: string): Promise<boolean> => {
    const tid = tabId ?? activeTabId
    const tab = tabs.find(t => t.id === tid)
    if (!tab || tab.readOnly) return false
    const blocks = tab.blocks
    if (!blocks || blocks.length === 0) return false

    try {
      const { title, artist } = extractSongMeta(blocks)
      const slug = songSlug(artist, title)
      if (!slug || slug === '--sem-titulo') return false
      const sd = tab.syncData
      const syncMeta = sd ? { bpm: sd.bpm, beatsPerBar: sd.beatsPerBar, offsetSeconds: sd.offsetSeconds } : undefined
      const res = await fetch('/api/songs/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbSongId: tab.dbSongId,
          title, artist,
          sourceUrl: tab.sourceUrl,
          content: JSON.stringify(blocks),
          syncMeta,
          arrangement: tab.arrangement,
          chordOverrides: tab.chordOverrides,
          extraChords: tab.extraChords,
          loopMarkers: tab.loopMarkers,
        }),
      })
      // 410 = música deletada do banco — mantém dbSongId para próximos autosaves
      // também receberem 410 e pararem (limpar causaria recriação na próxima tentativa)
      if (res.status === 410) return false
      if (!res.ok) return false
      const { songId } = await res.json()
      setTabs(prev => prev.map(t => t.id === tid ? { ...t, dbSongId: songId } : t))
      clearDirty(tid)
      return true
    } catch {
      return false
    }
  }, [activeTabId, tabs, clearDirty])

  const publishDraft = useCallback(async (): Promise<'published' | 'pending_review' | null> => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return null
    const blocks = tab.blocks
    if (!blocks || blocks.length === 0) return null

    try {
      const { title, artist } = extractSongMeta(blocks)
      const slug = songSlug(artist, title)
      if (!slug || slug === '--sem-titulo') return null

      const sd = tab.syncData
      const syncMeta = sd ? { bpm: sd.bpm, beatsPerBar: sd.beatsPerBar, offsetSeconds: sd.offsetSeconds } : undefined
      const saveRes = await fetch('/api/songs/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbSongId: tab.dbSongId,
          title, artist,
          sourceUrl: tab.sourceUrl,
          content: JSON.stringify(blocks),
          syncMeta,
          arrangement: tab.arrangement,
          chordOverrides: tab.chordOverrides,
          extraChords: tab.extraChords,
          loopMarkers: tab.loopMarkers,
        }),
      })
      if (!saveRes.ok) return null
      const saved = await saveRes.json()
      const songId = saved.songId
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, dbSongId: songId } : t))

      const res = await fetch(`/api/songs/${songId}/publish`, { method: 'POST' })
      if (!res.ok) return null
      const { status } = await res.json()
      if (status === 'published' || status === 'pending_review') setLastPublishedAt(Date.now())
      return status
    } catch {
      return null
    }
  }, [tabs, activeTabId])

  const saveCustomBlockType = useCallback((entry: CustomBlockType) => {
    setCustomBlockTypes(prev => {
      const next = [entry, ...prev.filter(e => e.name !== entry.name)]
      localStorage.setItem('cifra-custom-block-types', JSON.stringify(next))
      return next
    })
  }, [])

  const removeCustomBlockType = useCallback((name: string) => {
    setCustomBlockTypes(prev => {
      const next = prev.filter(e => e.name !== name)
      localStorage.setItem('cifra-custom-block-types', JSON.stringify(next))
      return next
    })
  }, [])

  // ── History helpers ──────────────────────────────────────────────────────────

  const pushUndo = useCallback((tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId)
    if (!tab) return
    undoStackRef.current[tabId] = [...(undoStackRef.current[tabId] ?? []), tab].slice(-HISTORY_MAX)
    redoStackRef.current[tabId] = []
    setHistoryVersion(v => v + 1)
    markDirty(tabId)
  }, [markDirty])

  // Debounced variant for rapid text edits — only one undo entry per 500 ms per tab.
  const pushUndoForLine = useCallback((tabId: string) => {
    const now = Date.now()
    const last = lastLinePushRef.current
    if (last && last.tabId === tabId && now - last.time < 500) return
    lastLinePushRef.current = { tabId, time: now }
    pushUndo(tabId)
  }, [pushUndo])

  const undo = useCallback(() => {
    const stack = undoStackRef.current[activeTabId] ?? []
    if (stack.length === 0) return
    const prev = stack[stack.length - 1]
    undoStackRef.current[activeTabId] = stack.slice(0, -1)
    const current = tabsRef.current.find(t => t.id === activeTabId)
    if (current) {
      redoStackRef.current[activeTabId] = [
        ...(redoStackRef.current[activeTabId] ?? []),
        current,
      ].slice(-HISTORY_MAX)
    }
    setTabs(ts => ts.map(t => t.id === activeTabId ? prev : t))
    setHistoryVersion(v => v + 1)
  }, [activeTabId])

  const redo = useCallback(() => {
    const stack = redoStackRef.current[activeTabId] ?? []
    if (stack.length === 0) return
    const next = stack[stack.length - 1]
    redoStackRef.current[activeTabId] = stack.slice(0, -1)
    const current = tabsRef.current.find(t => t.id === activeTabId)
    if (current) {
      undoStackRef.current[activeTabId] = [
        ...(undoStackRef.current[activeTabId] ?? []),
        current,
      ].slice(-HISTORY_MAX)
    }
    setTabs(ts => ts.map(t => t.id === activeTabId ? next : t))
    setHistoryVersion(v => v + 1)
  }, [activeTabId])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canUndo = useMemo(() => (undoStackRef.current[activeTabId]?.length ?? 0) > 0, [historyVersion, activeTabId])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canRedo = useMemo(() => (redoStackRef.current[activeTabId]?.length ?? 0) > 0, [historyVersion, activeTabId])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo() }
      if (e.key === 'y')                 { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  // ── Tab lifecycle ────────────────────────────────────────────────────────────

  const addTab = useCallback((name: string = 'Sem título', defaultView?: 'editor' | 'chart', artist?: string): string => {
    const base = artist
      ? { ...createEmptyTab(name), blocks: parseTextToBlocks(`${name}\n${artist}`) }
      : createEmptyTab(name)
    const newTab: EditorTab = { ...base, ...(defaultView ? { defaultView } : {}) }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
    return newTab.id
  }, [])

  const createTabForSong = useCallback((title: string, artist: string): string => {
    const id = generateId()
    const blocks = parseTextToBlocks(`${title}\n${artist}`)
    const newTab: EditorTab = { id, name: title, blocks }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(id)
    return id
  }, [])

  const closeTab = useCallback((tabId: string) => {
    // Clean up history for the closed tab to free memory.
    delete undoStackRef.current[tabId]
    delete redoStackRef.current[tabId]
    clearDirty(tabId)

    setTabs(prev => {
      const tab  = prev.find(t => t.id === tabId)
      const idx  = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)

      if (tab) {
        try {
          const entry = { ...stripVolatileSync(tab), closedAt: Date.now() }
          const raw   = localStorage.getItem(RECENT_CLOSED_KEY)
          const list: (EditorTab & { closedAt: number })[] = raw ? JSON.parse(raw) : []
          // Dedup por tab.id E por dbSongId/nome para evitar duplicatas ao fechar
          const updated = [entry, ...list.filter(r =>
            r.id !== tab.id &&
            !(tab.dbSongId ? r.dbSongId === tab.dbSongId : r.name.toLowerCase() === tab.name.toLowerCase())
          )].slice(0, RECENT_MAX)
          localStorage.setItem(RECENT_CLOSED_KEY, JSON.stringify(updated))
        } catch { /* ignora erros de localStorage */ }
      }

      setActiveTabId(cur => {
        if (cur !== tabId) return cur
        return next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? ''
      })
      return next
    })
  }, [])

  const renameTab = useCallback((tabId: string, name: string) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => (t.id === tabId ? { ...t, name } : t)))
  }, [pushUndo])

  const pasteText = useCallback((tabId: string, text: string) => {
    pushUndo(tabId)
    const blocks = parseTextToBlocks(text)
    const headerBlock = blocks.find(b => b.type === 'header')
    const headerTitle = headerBlock?.sections[0]?.lines[0]?.text?.trim()
    setTabs(prev =>
      prev.map(t => {
        if (t.id !== tabId) return t
        return { ...t, blocks, ...(headerTitle ? { name: headerTitle } : {}) }
      })
    )
  }, [pushUndo])

  const updateBlock = useCallback((tabId: string, block: Block) => {
    pushUndo(tabId)
    setTabs(prev =>
      prev.map(t => {
        if (t.id !== tabId) return t
        return {
          ...t,
          blocks: t.blocks.map(b => (b.id === block.id ? block : b)),
        }
      })
    )
  }, [pushUndo])

  const removeBlock = useCallback((tabId: string, blockId: string) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const blocks = t.blocks.filter(b => b.id !== blockId)
      // Remove entradas do arrangement que referenciam este bloco
      const arrangement = t.arrangement?.filter(e => e.blockId !== blockId)
      // Remove overrides e extras cujas chaves pertencem a entradas do bloco removido
      const removedEntryIds = new Set(
        (t.arrangement ?? []).filter(e => e.blockId === blockId).map(e => e.id)
      )
      const cleanRecord = (rec: Record<string, string[]> | undefined) => {
        if (!rec) return rec
        const next: Record<string, string[]> = {}
        for (const [k, v] of Object.entries(rec)) {
          const entryId = k.split(':')[0]
          const baseId  = entryId.replace(/-p2$/, '')
          if (!removedEntryIds.has(baseId)) next[k] = v
        }
        return Object.keys(next).length ? next : undefined
      }
      return {
        ...t,
        blocks,
        ...(arrangement ? { arrangement: arrangement.length ? arrangement : undefined } : {}),
        chordOverrides: cleanRecord(t.chordOverrides),
        extraChords:    cleanRecord(t.extraChords),
      }
    }))
  }, [pushUndo])

  const updateLine = useCallback(
    (tabId: string, blockId: string, sectionId: string, line: Line) => {
      pushUndoForLine(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.id !== sectionId) return s
                  return { ...s, lines: s.lines.map(l => (l.id === line.id ? line : l)) }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndoForLine]
  )

  const insertChord = useCallback(
    (tabId: string, blockId: string, sectionId: string, lineId: string, chord: ChordPosition) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.id !== sectionId) return s
                  return {
                    ...s,
                    lines: s.lines.map(l => {
                      if (l.id !== lineId) return l
                      return { ...l, chords: [...l.chords, chord] }
                    }),
                  }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const updateChord = useCallback(
    (tabId: string, blockId: string, sectionId: string, lineId: string, chord: ChordPosition) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.id !== sectionId) return s
                  return {
                    ...s,
                    lines: s.lines.map(l => {
                      if (l.id !== lineId) return l
                      return { ...l, chords: l.chords.map(c => (c.id === chord.id ? chord : c)) }
                    }),
                  }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const removeChord = useCallback(
    (tabId: string, blockId: string, sectionId: string, lineId: string, chordId: string) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.id !== sectionId) return s
                  return {
                    ...s,
                    lines: s.lines.map(l => {
                      if (l.id !== lineId) return l
                      return { ...l, chords: l.chords.filter(c => c.id !== chordId) }
                    }),
                  }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  // Régua: aplica break em todas as seções de texto (LYRICS_CHORDS e CHORDS_ONLY) dos blocos
  const breakLinesAtPosition = useCallback(
    (tabId: string, blockIds: string[], position: number) => {
      if (position <= 0) return
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (!blockIds.includes(b.id)) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.type === 'TAB') return s
                  const currentLines = s.lines
                  const snappedLines = currentLines.map(l => ({
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
                        .map(c => ({ ...c, id: generateId(), position: Math.max(0, c.position - chordOffset) }))
                      newLines.push({ ...remaining, text: text1, chords: chords1 })
                      remaining = { id: generateId(), text: text2, chords: chords2, continuation: true }
                    }
                    newLines.push(remaining)
                  }
                  return { ...s, lines: newLines }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const joinLinesUpToPosition = useCallback(
    (tabId: string, blockIds: string[], position: number) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (!blockIds.includes(b.id)) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.type === 'TAB') return s
                  const currentLines = s.lines
                  const result: Line[] = []
                  let i = 0
                  while (i < currentLines.length) {
                    let current = { ...currentLines[i] }
                    while (i + 1 < currentLines.length && currentLines[i + 1].continuation) {
                      const next = currentLines[i + 1]
                      if (current.text.length + 1 + next.text.length > position) break
                      const offset = current.text.length + 1
                      current = {
                        ...current,
                        text: current.text + ' ' + next.text,
                        continuation: current.continuation,
                        chords: [
                          ...current.chords,
                          ...next.chords.map(c => ({ ...c, position: c.position + offset })),
                        ],
                      }
                      i++
                    }
                    result.push(current)
                    i++
                  }
                  return { ...s, lines: result }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const snapOuterChordsToPosition = useCallback(
    (tabId: string, blockIds: string[], position: number) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (!blockIds.includes(b.id)) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.type === 'TAB') return s
                  return {
                    ...s,
                    lines: s.lines.map(l => ({
                      ...l,
                      chords: l.chords.map(c => {
                        if (c.position < l.text.length) return c
                        if (c.position <= position) return c
                        return { ...c, position: Math.max(position, Math.max(0, l.text.length - 1)) }
                      }),
                    })),
                  }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const addSection = useCallback(
    (tabId: string, blockId: string, type: SectionType, afterSectionId?: string) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              const newSection = createSection(type)
              if (!afterSectionId) {
                return { ...b, sections: [...b.sections, newSection] }
              }
              const idx = b.sections.findIndex(s => s.id === afterSectionId)
              if (idx === -1) return { ...b, sections: [...b.sections, newSection] }
              const next = [...b.sections]
              next.splice(idx + 1, 0, newSection)
              return { ...b, sections: next }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const removeSection = useCallback(
    (tabId: string, blockId: string, sectionId: string) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              if (b.sections.length <= 1) return b  // nunca remover a última seção
              return { ...b, sections: b.sections.filter(s => s.id !== sectionId) }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const updateSection = useCallback(
    (tabId: string, blockId: string, section: Section) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              return {
                ...b,
                sections: b.sections.map(s => (s.id === section.id ? section : s)),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  // Remove uma linha (e seus acordes) de forma atômica — um único pushUndo,
  // lê o estado mais recente via setTabs(prev => ...) para evitar closure stale.
  const removeLine = useCallback(
    (tabId: string, blockId: string, sectionId: string, lineId: string) => {
      pushUndo(tabId)
      setTabs(prev =>
        prev.map(t => {
          if (t.id !== tabId) return t
          return {
            ...t,
            blocks: t.blocks.map(b => {
              if (b.id !== blockId) return b
              return {
                ...b,
                sections: b.sections.map(s => {
                  if (s.id !== sectionId) return s
                  return { ...s, lines: s.lines.filter(l => l.id !== lineId) }
                }),
              }
            }),
          }
        })
      )
    },
    [pushUndo]
  )

  const importInNewTab = useCallback((blocks: Block[], name: string, syncData?: SyncData, opts?: { dbSongId?: string; sourceUrl?: string; readOnly?: boolean; arrangement?: ArrangementEntry[]; chordOverrides?: Record<string, string[]>; extraChords?: Record<string, string[]>; loopMarkers?: Record<string, LoopMarker> }): string => {
    const migrated = blocks.map(migrateBlock)
    const id = generateId()
    const newTab: EditorTab = {
      id,
      name,
      blocks: migrated,
      ...(syncData              ? { syncData }                       : {}),
      ...(opts?.dbSongId        ? { dbSongId:     opts.dbSongId }   : {}),
      ...(opts?.sourceUrl       ? { sourceUrl:    opts.sourceUrl }   : {}),
      ...(opts?.readOnly        ? { readOnly:     true, defaultView: 'chart' } : {}),
      ...(opts?.arrangement?.length ? { arrangement: opts.arrangement } : {}),
      ...(opts?.chordOverrides && Object.keys(opts.chordOverrides).length ? { chordOverrides: opts.chordOverrides } : {}),
      ...(opts?.extraChords && Object.keys(opts.extraChords).length ? { extraChords: opts.extraChords } : {}),
      ...(opts?.loopMarkers && Object.keys(opts.loopMarkers).length ? { loopMarkers: opts.loopMarkers } : {}),
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(id)
    clearDirty(id)
    return id
  }, [clearDirty])

  const setTabReadOnly = useCallback((tabId: string, readOnly: boolean) => {
    setTabs(prev => prev.map(t => t.id !== tabId ? t : { ...t, readOnly }))
  }, [])

  const importBlocks = useCallback((tabId: string, blocks: Block[], name?: string, sourceUrl?: string) => {
    pushUndo(tabId)
    const migrated = blocks.map(migrateBlock)
    setTabs(prev =>
      prev.map(t => {
        if (t.id !== tabId) return t
        return {
          ...t,
          blocks: migrated,
          ...(name ? { name } : {}),
          ...(sourceUrl !== undefined ? { sourceUrl, dbSongId: undefined } : {}),
        }
      })
    )
  }, [pushUndo])

  const resetTabContent = useCallback((tabId: string, blocks: Block[], opts?: { name?: string; arrangement?: ArrangementEntry[] }) => {
    pushUndo(tabId)
    const migrated = blocks.map(migrateBlock)
    // Strip deletedRows de todas as entradas — reset completo não preserva deleções do usuário
    const cleanArrangement = opts?.arrangement?.length
      ? opts.arrangement.map(e => {
          if (!e.deletedRows?.length) return e
          const { deletedRows: _, ...rest } = e
          return rest as ArrangementEntry
        })
      : undefined
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      // Preserva syncData mas remove timeSigChanges (inválido com novos blocos)
      let newSyncData = t.syncData
      if (newSyncData?.timeSigChanges) {
        const { timeSigChanges: _, ...rest } = newSyncData
        newSyncData = rest as typeof newSyncData
      }
      return {
        ...t,
        blocks: migrated,
        arrangement: cleanArrangement,
        chordOverrides: undefined,
        extraChords: undefined,
        loopMarkers: undefined,
        syncData: newSyncData,
        ...(opts?.name ? { name: opts.name } : {}),
      }
    }))
  }, [pushUndo])

  const transposeTab = useCallback((tabId: string, semitones: number) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(tab => {
      if (tab.id !== tabId) return tab

      const currentKey = tab.blocks.find(b => b.type === 'header')?.songKey ?? ''
      const newKey     = currentKey ? transposeKey(currentKey, semitones) : ''
      const flats      = preferFlats(newKey || currentKey)

      return {
        ...tab,
        blocks: tab.blocks.map(block => ({
          ...block,
          songKey: block.songKey ? transposeKey(block.songKey, semitones) : block.songKey,
          sections: block.sections.map(section => ({
            ...section,
            lines: section.lines.map(line => ({
              ...line,
              chords: line.chords.map(c => ({
                ...c,
                value: transposeChord(c.value, semitones, flats),
              })),
            })),
          })),
        })),
      }
    }))
  }, [pushUndo])

  const setSyncData = useCallback((tabId: string, data: SyncData | undefined) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, syncData: data } : t))
  }, [])

  const setArrangement = useCallback((tabId: string, entries: ArrangementEntry[] | undefined) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, arrangement: entries } : t))
  }, [pushUndo])

  const setTimeSigChange = useCallback((tabId: string, key: string, timeSig: { num: number; den: number } | null) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const cur = t.syncData?.timeSigChanges ?? {}
      const next = { ...cur }
      if (timeSig) next[key] = timeSig
      else delete next[key]
      return { ...t, syncData: { ...(t.syncData ?? { bpm: 120, beatsPerBar: 4, offsetSeconds: 0 }), timeSigChanges: Object.keys(next).length > 0 ? next : undefined } }
    }))
  }, [pushUndo])

  const setChordOverride = useCallback((tabId: string, barKey: string, chords: string[] | undefined) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const cur = t.chordOverrides ?? {}
      const next: Record<string, string[]> = { ...cur }
      if (chords === undefined) delete next[barKey]
      else next[barKey] = chords
      return { ...t, chordOverrides: Object.keys(next).length > 0 ? next : undefined }
    }))
  }, [pushUndo])

  const setAllChordOverrides = useCallback((tabId: string, overrides: Record<string, string[]> | undefined) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t =>
      t.id !== tabId ? t : { ...t, chordOverrides: overrides && Object.keys(overrides).length > 0 ? overrides : undefined }
    ))
  }, [pushUndo])

  const setAllExtraChords = useCallback((tabId: string, extras: Record<string, string[]> | undefined) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t =>
      t.id !== tabId ? t : { ...t, extraChords: extras && Object.keys(extras).length > 0 ? extras : undefined }
    ))
  }, [pushUndo])

  // Deletes one added row atomically: decrements addedCells and remaps overrides
  // in a single setTabs call so that prev.chordOverrides is always the latest state.
  const deleteAddedRow = useCallback((
    tabId: string,
    entryId: string,
    rowStart: number,
    rowEnd: number,
    barsPerRow: number,
  ) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t

      // Update addedCells for this entry
      const newArrangement = (t.arrangement ?? []).map(e =>
        e.id !== entryId ? e : { ...e, addedCells: Math.max(0, (e.addedCells ?? 0) - barsPerRow) }
      )

      // Remap a chord record: keep ci < rowStart, drop rowStart–rowEnd, shift ci > rowEnd down
      function remapChords(src: Record<string, string[]> | undefined): Record<string, string[]> | undefined {
        if (!src) return src
        const next: Record<string, string[]> = {}
        for (const [key, val] of Object.entries(src)) {
          const colonIdx = key.lastIndexOf(':')
          const kId = key.slice(0, colonIdx)
          if (kId !== entryId) { next[key] = val; continue }
          const ci = parseInt(key.slice(colonIdx + 1), 10)
          if (ci < rowStart) next[key] = val
          else if (ci <= rowEnd) { /* drop */ }
          else next[`${entryId}:${ci - barsPerRow}`] = val
        }
        return Object.keys(next).length > 0 ? next : undefined
      }

      return {
        ...t,
        arrangement: newArrangement,
        chordOverrides: remapChords(t.chordOverrides),
        extraChords: remapChords(t.extraChords),
      }
    }))
  }, [pushUndo])

  const addExtraChord = useCallback((tabId: string, key: string, chord: string) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const cur = t.extraChords ?? {}
      return { ...t, extraChords: { ...cur, [key]: [...(cur[key] ?? []), chord] } }
    }))
  }, [pushUndo])

  const deleteExtraChord = useCallback((tabId: string, key: string, idx: number) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const cur = t.extraChords ?? {}
      const arr = [...(cur[key] ?? [])]
      arr.splice(idx, 1)
      const next = { ...cur, [key]: arr }
      if (arr.length === 0) delete next[key]
      return { ...t, extraChords: Object.keys(next).length > 0 ? next : undefined }
    }))
  }, [pushUndo])

  const addBlock = useCallback((tabId: string, afterBlockId: string) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const afterBlock = t.blocks.find(b => b.id === afterBlockId)
      if (!afterBlock) return t
      const newBlockId = generateId()
      const newBlock: Block = {
        id: newBlockId,
        name: '',
        type: 'unknown',
        sections: [createSection('CHORDS_ONLY')],
        order: afterBlock.order + 0.5,
      }
      const sorted = [...t.blocks, newBlock].sort((a, b) => a.order - b.order)
      const reordered = sorted.map((b, i) => ({ ...b, order: i }))
      // Novo bloco começa com 1 célula vazia para aparecer no chart imediatamente
      const newEntry: ArrangementEntry = { id: `auto-${newBlockId}`, blockId: newBlockId, repeatCount: 1, addedCells: 1 }
      // Garante arrangement customizado para o entry aparecer mesmo sem bars originais
      const baseArr = t.arrangement?.length ? t.arrangement : detectArrangement(t.blocks)
      const afterIdx = baseArr.findLastIndex(e => e.blockId === afterBlockId)
      const arr = [...baseArr]
      arr.splice(afterIdx !== -1 ? afterIdx + 1 : arr.length, 0, newEntry)
      return { ...t, blocks: reordered, arrangement: arr }
    }))
  }, [pushUndo])

  const duplicateBlock = useCallback((tabId: string, blockId: string, entryId: string, newBlockId?: string, newEntryId?: string) => {
    pushUndo(tabId)
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const block = t.blocks.find(b => b.id === blockId)
      if (!block) return t

      const resolvedNewBlockId = newBlockId ?? generateId()
      const newBlock: Block = {
        ...structuredClone(block),
        id: resolvedNewBlockId,
        sections: block.sections.map(s => ({
          ...structuredClone(s),
          id: generateId(),
          lines: s.lines.map(l => ({
            ...structuredClone(l),
            id: generateId(),
            chords: l.chords.map(c => ({ ...c, id: generateId() })),
          })),
        })),
        order: block.order + 0.5,
      }
      const sorted = [...t.blocks, newBlock].sort((a, b) => a.order - b.order)
      const reordered = sorted.map((b, i) => ({ ...b, order: i }))

      const baseArr = t.arrangement?.length ? t.arrangement : detectArrangement(t.blocks)
      const origEntry = baseArr.find(e => e.id === entryId)
      const afterIdx = baseArr.findLastIndex(e => e.blockId === blockId)
      const resolvedNewEntryId = newEntryId ?? generateId()
      const newEntry: ArrangementEntry = origEntry
        ? { ...structuredClone(origEntry), id: resolvedNewEntryId, blockId: resolvedNewBlockId }
        : { id: resolvedNewEntryId, blockId: resolvedNewBlockId, repeatCount: 1 }
      const arr = [...baseArr]
      arr.splice(afterIdx !== -1 ? afterIdx + 1 : arr.length, 0, newEntry)

      const cloneChords = (src: Record<string, string[]> | undefined) => {
        if (!src) return src
        const result = { ...src }
        for (const [key, val] of Object.entries(src)) {
          if (key.startsWith(`${entryId}:`)) {
            result[`${resolvedNewEntryId}:${key.slice(entryId.length + 1)}`] = val
          }
        }
        return result
      }

      return {
        ...t,
        blocks: reordered,
        arrangement: arr,
        chordOverrides: cloneChords(t.chordOverrides),
        extraChords: cloneChords(t.extraChords),
      }
    }))
  }, [pushUndo])

  // Divide as linhas de texto de um bloco na posição de bar `atBar` (espaço bruto).
  function splitLinesAtBar(block: Block, atBar: number): { firstLines: Line[]; secondLines: Line[] } {
    const textSection = block.sections.find(s => s.type === 'LYRICS_CHORDS' || s.type === 'CHORDS_ONLY')
    if (!textSection || atBar <= 0) return { firstLines: textSection?.lines ?? [], secondLines: [] }
    const lines = textSection.lines
    const isChordsOnly = textSection.type === 'CHORDS_ONLY'
    let barCount = 0
    for (let i = 0; i < lines.length; i++) {
      const chords = lines[i].chords.filter(c => c.value)
      if (isChordsOnly) {
        if (barCount + chords.length >= atBar) {
          return { firstLines: lines.slice(0, barCount === atBar ? i : i + 1), secondLines: lines.slice(barCount === atBar ? i : i + 1) }
        }
        barCount += chords.length
      } else {
        if (!lines[i].continuation && chords.length > 0) {
          if (barCount === atBar) return { firstLines: lines.slice(0, i), secondLines: lines.slice(i) }
          barCount++
        }
      }
    }
    return { firstLines: lines, secondLines: [] }
  }

  const splitBlock = useCallback((tabId: string, entryId: string, blockId: string, atCellIndex: number) => {
    pushUndo(tabId)
    // Calcula IDs fora do setTabs para poder usar nas atualizações de loopMarkers
    const newBlockId = generateId()
    const newEntryId = `auto-${newBlockId}`

    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t
      const block = t.blocks.find(b => b.id === blockId)
      if (!block) return t
      const effectiveArr = t.arrangement?.length ? t.arrangement : detectArrangement(t.blocks)
      const entry = effectiveArr.find(e => e.id === entryId)
      const barsPerCell = entry?.barsPerCell ?? 1
      const atBar = atCellIndex * barsPerCell

      const textSection = block.sections.find(s => s.type === 'LYRICS_CHORDS' || s.type === 'CHORDS_ONLY')
      if (!textSection) return t

      const { firstLines, secondLines } = splitLinesAtBar(block, atBar)

      const blockA: Block = {
        ...block,
        sections: block.sections.map(s => s.id === textSection.id ? { ...s, lines: firstLines } : s),
      }
      const blockB: Block = {
        id: newBlockId,
        name: block.name ? `${block.name} (2)` : '',
        type: block.type,
        color: block.color,
        sections: [createSection(textSection.type, secondLines)],
        order: block.order + 0.5,
      }

      // Remapeia chordOverrides e extraChords: chaves do bloco B mudam de entryId:N para newEntryId:(N-atCellIndex)
      const remapRecord = (rec: Record<string, string[]> | undefined): Record<string, string[]> | undefined => {
        if (!rec) return undefined
        const next: Record<string, string[]> = {}
        for (const [key, val] of Object.entries(rec)) {
          if (key.startsWith(`${entryId}:`)) {
            const ci = parseInt(key.slice(entryId.length + 1), 10)
            if (ci >= atCellIndex) {
              next[`${newEntryId}:${ci - atCellIndex}`] = val
            } else {
              next[key] = val
            }
          } else {
            next[key] = val
          }
        }
        return Object.keys(next).length > 0 ? next : undefined
      }

      const newChordOverrides = remapRecord(t.chordOverrides)
      const newExtraChords = remapRecord(t.extraChords)

      const sorted = t.blocks
        .map(b => b.id === blockId ? blockA : b)
        .concat(blockB)
        .sort((a, b) => a.order - b.order)
        .map((b, i) => ({ ...b, order: i }))

      // Atualiza ou cria arranjo com duas entradas no lugar da original.
      // addedCells do bloco A são zerados (as células excedentes pertenciam à segunda metade);
      // addedCells do bloco B recebem o valor original (as linhas extras ficam no final do B).
      const originalAddedCells = entry?.addedCells ?? 0
      let newArrangement = t.arrangement
      if (t.arrangement?.length) {
        const eIdx = t.arrangement.findIndex(e => e.id === entryId)
        if (eIdx !== -1) {
          const arr = [...t.arrangement]
          // Bloco A: zera addedCells para não mostrar linhas fantasma
          arr[eIdx] = { ...arr[eIdx], addedCells: 0 }
          const newEntry: ArrangementEntry = {
            id: newEntryId,
            blockId: newBlockId,
            repeatCount: 1,
            ...(originalAddedCells > 0 ? { addedCells: originalAddedCells } : {}),
          }
          arr.splice(eIdx + 1, 0, newEntry)
          newArrangement = arr
        }
      }

      // Migra loop marker para o bloco B se o loop cruzar o ponto de divisão
      let newLoopMarkers = t.loopMarkers
      const lm = t.loopMarkers?.[entryId]
      if (lm) {
        if (lm.rawBarEnd >= atCellIndex) {
          const { [entryId]: _, ...rest } = t.loopMarkers ?? {}
          newLoopMarkers = { ...rest, [newEntryId]: { rawBarEnd: lm.rawBarEnd - atCellIndex, count: lm.count } }
        }
      }

      return {
        ...t,
        blocks: sorted,
        chordOverrides: newChordOverrides,
        extraChords: newExtraChords,
        ...(newArrangement !== t.arrangement ? { arrangement: newArrangement } : {}),
        ...(newLoopMarkers !== t.loopMarkers ? { loopMarkers: newLoopMarkers } : {}),
      }
    }))
  }, [pushUndo])

  const filledBars = useMemo<FilledBar[]>(() => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab || tab.blocks.length === 0) return []

    const effectiveArr = tab.arrangement?.length
      ? tab.arrangement
      : detectArrangement(tab.blocks)

    const result: FilledBar[] = []

    for (const entry of effectiveArr) {
      const block = tab.blocks.find(b => b.id === entry.blockId)
      if (!block) continue
      const bars = extractBarsFromBlock(block)
      if (bars.length === 0) continue
      const bpc = entry.barsPerCell ?? 1
      const cells = mergedBarsForSection(bars, bpc)

      // Células originais (têm acordes da cifra + eventuais extras/overrides)
      cells.forEach((cell, cellIndex) => {
        const key = `${entry.id}:${cellIndex}`
        const override = tab.chordOverrides?.[key]
        const chords = override !== undefined
          ? override
          : [...cell.flat(), ...(tab.extraChords?.[key] ?? [])]
        if (chords.length > 0) result.push({ key, entryId: entry.id, cellIndex, chords })
      })

      // Células adicionadas pelo usuário (índices além das originais — sem acorde nativo)
      const addedCount = entry.addedCells ?? 0
      for (let ci = cells.length; ci < cells.length + addedCount; ci++) {
        const key = `${entry.id}:${ci}`
        const override = tab.chordOverrides?.[key]
        const extras = tab.extraChords?.[key] ?? []
        const chords = override !== undefined ? override : extras
        if (chords.length > 0) result.push({ key, entryId: entry.id, cellIndex: ci, chords })
      }
    }

    return result
  }, [tabs, activeTabId])

  const openChordSelector = useCallback((state: ChordSelectorState) => {
    setChordSelector(state)
  }, [])

  const closeChordSelector = useCallback(() => {
    setChordSelector(null)
  }, [])

  const exportActiveTab = useCallback(() => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab) return
    const payload = JSON.stringify({ v: 1, tab: stripVolatileSync(tab) }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = tab.name.replace(/[/\\?%*:|"<>]/g, '-') || 'cifra'
    a.download = `${safeName}.cifra`
    a.click()
    URL.revokeObjectURL(url)
  }, [tabs, activeTabId])

  const seekToBar = useCallback(async (barIndex: number) => {
    const sd = tabs.find(t => t.id === activeTabId)?.syncData
    if (!sd) return
    const positionMs = barIndexToMs(sd, barIndex)
    setSyncData(activeTabId, {
      ...sd,
      extProgressMs: positionMs,
      extProgressAt: Date.now(),
    })
    try {
      await fetch('/api/spotify/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seek', positionMs }),
      })
    } catch { /* silencioso */ }
  }, [tabs, activeTabId, setSyncData])

  const loadTabFromFile = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const raw = JSON.parse(e.target?.result as string)
          const tab: EditorTab = raw.v === 1 ? raw.tab : raw
          if (!tab || !Array.isArray(tab.blocks)) throw new Error('Formato inválido')
          const migrated: EditorTab = { ...tab, blocks: tab.blocks.map(migrateBlock) }
          setTabs(prev => [...prev, migrated])
          setActiveTabId(migrated.id)
          resolve()
        } catch (err) { reject(err) }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }, [])

  return (
    <EditorContext.Provider
      value={{
        tabs,
        activeTabId,
        activeTab,
        chordSelector,
        textSize,
        chordSize,
        chordColor,
        twoColumns,
        columnFlow,
        pageMargin,
        columnGap,
        setTextSize,
        setChordSize,
        setChordColor,
        setTwoColumns,
        setColumnFlow,
        setPageMargin,
        setColumnGap,
        blockGap,
        setBlockGap,
        isAdjustingMargin,
        isAdjustingColumnGap,
        setIsAdjustingMargin,
        setIsAdjustingColumnGap,
        addTab,
        closeTab,
        setActiveTab: setActiveTabId,
        renameTab,
        pasteText,
        updateBlock,
        removeBlock,
        updateLine,
        insertChord,
        updateChord,
        removeChord,
        openChordSelector,
        closeChordSelector,
        breakLinesAtPosition,
        joinLinesUpToPosition,
        snapOuterChordsToPosition,
        addSection,
        removeSection,
        updateSection,
        removeLine,
        customBlockTypes,
        saveCustomBlockType,
        removeCustomBlockType,
        hideUnnamedBlocks,
        setHideUnnamedBlocks,
        hideTabBlocks,
        setHideTabBlocks,
        highlightOutOfKey,
        setHighlightOutOfKey,
        showBeatDot,
        setShowBeatDot,
        showSyncTools,
        setShowSyncTools,
        animPrefs,
        setAnimPrefs,
        activeSongKey,
        importBlocks,
        importInNewTab,
        resetTabContent,
        setTabReadOnly,
        transposeTab,
        setSyncData,
        setArrangement,
        deleteAddedRow,
        addExtraChord,
        deleteExtraChord,
        setTimeSigChange,
        setChordOverride,
        setAllChordOverrides,
        setAllExtraChords,
        addBlock,
        duplicateBlock,
        splitBlock,
        loopMarkers,
        setLoopMarker,
        filledBars,
        exportActiveTab,
        loadTabFromFile,
        seekToBar,
        saveDraft,
        isTabDirty: (tabId: string) => isTabDirty(dirtyVersion, tabId),
        publishDraft,
        lastPublishedAt,
        createTabForSong,
        tabsLoaded: loaded,
        nowPlayingTitle,
        setNowPlayingTitle,
        nowPlayingIsPlaying,
        setNowPlayingIsPlaying,
        undo,
        redo,
        canUndo,
        canRedo,
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used within EditorProvider')
  return ctx
}
