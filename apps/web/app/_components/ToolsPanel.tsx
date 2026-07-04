'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useEditor } from '../_context/EditorContext'
import { IconSettings, IconChevronUp, IconChevronDown } from '@/components/ui/icons'

const DEFAULTS = {
  textSize: 14,
  chordSize: 14,
  chordColor: '#4f46e5',
  twoColumns: false,
  columnFlow: 'vertical' as const,
  pageMargin: 10,
  columnGap: 6,
  showBeatDot: false,
}

const MIN = 10
const MAX = 24
const STEP = 1

function SizeControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChange(Math.max(MIN, value - STEP))}
          className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
        >
          −
        </button>
        <span className="w-8 text-center text-xs font-mono text-white tabular-nums">
          {value}px
        </span>
        <button
          onClick={() => onChange(Math.min(MAX, value + STEP))}
          className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
        >
          +
        </button>
      </div>
    </div>
  )
}

const PRESET_COLORS = [
  '#4f46e5', // indigo
  '#dc2626', // red
  '#16a34a', // green
  '#2563eb', // blue
  '#9333ea', // purple
  '#ea580c', // orange
  '#0f172a', // black
]

const MARGIN_MIN = 0
const MARGIN_MAX = 50
const MARGIN_STEP = 2

const GAP_MIN  = 0
const GAP_MAX  = 30
const GAP_STEP = 2

export default function ToolsPanel() {
  const { textSize, chordSize, chordColor, twoColumns, columnFlow, pageMargin, columnGap, blockGap, setTextSize, setChordSize, setChordColor, setTwoColumns, setColumnFlow, setPageMargin, setColumnGap, setBlockGap, setIsAdjustingMargin, setIsAdjustingColumnGap, activeTabId, activeTab, joinLinesUpToPosition, hideUnnamedBlocks, setHideUnnamedBlocks, hideTabBlocks, setHideTabBlocks, highlightOutOfKey, setHighlightOutOfKey, activeSongKey, transposeTab, showBeatDot, setShowBeatDot, animPrefs, setAnimPrefs } = useEditor()
  const [open, setOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Garante reset caso o painel feche enquanto algum hover de ajuste ainda estiver ativo
  useEffect(() => {
    if (!open) {
      setIsAdjustingMargin(false)
      setIsAdjustingColumnGap(false)
    }
  }, [open, setIsAdjustingMargin, setIsAdjustingColumnGap])

  return (
    <div ref={panelRef} className="absolute top-4 right-4 z-20">
      {/* Botão de ferramentas */}
      <button
        data-tools-btn
        onClick={() => setOpen(v => !v)}
        title="Ferramentas"
        className={`
          w-9 h-9 flex items-center justify-center rounded-full shadow-lg
          border transition-colors text-base
          ${open
            ? 'bg-raised border-faint text-ink'
            : 'bg-surface border-line text-muted hover:border-faint hover:text-ink'
          }
        `}
      >
        <IconSettings size={15} />
      </button>

      {/* Painel suspenso */}
      {open && (
        <div className="absolute top-[60px] right-0 bg-raised border border-line rounded-xl shadow-2xl p-3 w-52 flex flex-col gap-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">
            Ferramentas
          </p>

          <SizeControl
            label="Tamanho letra"
            value={textSize}
            onChange={setTextSize}
          />

          <SizeControl
            label="Tamanho cifra"
            value={chordSize}
            onChange={setChordSize}
          />

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideTabBlocks}
              onChange={e => setHideTabBlocks(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-muted leading-tight">Ocultar tablaturas</span>
          </label>

          {/* ── Transposição ── */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted w-20 shrink-0">Tom</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => activeTabId && transposeTab(activeTabId, -1)}
                className="w-7 h-6 text-xs rounded font-mono bg-surface text-muted hover:bg-line transition-colors"
                title="Meio tom abaixo"
              >−½</button>
              <span className="text-xs text-ink min-w-[2.5rem] text-center font-mono font-semibold">
                {activeSongKey || '—'}
              </span>
              <button
                onClick={() => activeTabId && transposeTab(activeTabId, +1)}
                className="w-7 h-6 text-xs rounded font-mono bg-surface text-muted hover:bg-line transition-colors"
                title="Meio tom acima"
              >+½</button>
            </div>
          </div>

          <label className={`flex items-center gap-2.5 cursor-pointer select-none ${!activeSongKey ? 'opacity-40 pointer-events-none' : ''}`} title={!activeSongKey ? 'Defina a tonalidade no cabeçalho da música' : ''}>
            <input
              type="checkbox"
              checked={highlightOutOfKey}
              onChange={e => setHighlightOutOfKey(e.target.checked)}
              disabled={!activeSongKey}
              className="w-3.5 h-3.5 accent-amber-500 cursor-pointer"
            />
            <span className="text-xs text-muted leading-tight">
              Destacar fora do campo harmônico
              {activeSongKey && <span className="ml-1 text-faint">({activeSongKey})</span>}
            </span>
          </label>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted w-20 shrink-0">Colunas</span>
            <div className="flex gap-1">
              {[1, 2].map(n => (
                <button
                  key={n}
                  onClick={() => setTwoColumns(n === 2)}
                  className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
                    (n === 2) === twoColumns
                      ? 'bg-indigo-600 text-white'
                      : 'bg-surface text-muted hover:bg-line'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {twoColumns && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted w-20 shrink-0">Leitura</span>
                <div className="flex gap-1">
                  {(['vertical', 'horizontal'] as const).map(flow => (
                    <button
                      key={flow}
                      onClick={() => setColumnFlow(flow)}
                      title={flow === 'horizontal' ? 'Esquerda → Direita → Esquerda' : 'Coluna esquerda completa → Coluna direita'}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        columnFlow === flow
                          ? 'bg-indigo-600 text-white'
                          : 'bg-surface text-muted hover:bg-line'
                      }`}
                    >
                      {flow === 'horizontal' ? '↔' : '↕'}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="flex items-center justify-between gap-3"
                onMouseEnter={() => setIsAdjustingColumnGap(true)}
                onMouseLeave={() => setIsAdjustingColumnGap(false)}
              >
                <span className="text-xs text-muted w-20 shrink-0">Entre colunas</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setColumnGap(Math.max(GAP_MIN, columnGap - GAP_STEP))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-xs font-mono text-white tabular-nums">
                    {columnGap === 0 ? 'off' : `${columnGap}mm`}
                  </span>
                  <button
                    onClick={() => setColumnGap(Math.min(GAP_MAX, columnGap + GAP_STEP))}
                    className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )}

          <div
            className="flex items-center justify-between gap-3"
            onMouseEnter={() => setIsAdjustingMargin(true)}
            onMouseLeave={() => setIsAdjustingMargin(false)}
          >
            <span className="text-xs text-muted w-20 shrink-0">Margem</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPageMargin(Math.max(MARGIN_MIN, pageMargin - MARGIN_STEP))}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center text-xs font-mono text-white tabular-nums">
                {pageMargin === 0 ? 'off' : `${pageMargin}mm`}
              </span>
              <button
                onClick={() => setPageMargin(Math.min(MARGIN_MAX, pageMargin + MARGIN_STEP))}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted w-20 shrink-0">Entre blocos</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setBlockGap(Math.max(0, blockGap - 2))}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
              >−</button>
              <span className="w-10 text-center text-xs font-mono text-white tabular-nums">
                {blockGap === 0 ? 'off' : `${blockGap}px`}
              </span>
              <button
                onClick={() => setBlockGap(Math.min(64, blockGap + 2))}
                className="w-6 h-6 flex items-center justify-center rounded bg-surface hover:bg-line text-ink text-sm font-bold leading-none transition-colors"
              >+</button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted uppercase tracking-wide">Cor do acorde</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setChordColor(color)}
                  title={color}
                  style={{ backgroundColor: color }}
                  className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${chordColor === color ? 'ring-2 ring-ink ring-offset-1 ring-offset-raised' : ''}`}
                />
              ))}
              <label
                title="Cor personalizada"
                className="w-5 h-5 rounded-full border border-dashed border-faint flex items-center justify-center cursor-pointer hover:border-muted overflow-hidden"
              >
                <input
                  type="color"
                  value={chordColor}
                  onChange={e => setChordColor(e.target.value)}
                  className="opacity-0 absolute w-0 h-0"
                />
                <span className="text-muted text-xs leading-none">+</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideUnnamedBlocks}
              onChange={e => setHideUnnamedBlocks(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-muted leading-tight">Ignorar blocos sem nome</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBeatDot}
              onChange={e => setShowBeatDot(e.target.checked)}
              className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-muted leading-tight">Mostrar bolinha de pulso</span>
          </label>

          {/* ── Animações do pulsador ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted uppercase tracking-wide">Animação do pulsador</span>
            <div className="flex flex-col gap-1">
              {([
                { key: 'barra',    label: 'Barra de progresso' },
                { key: 'cobrinha', label: 'Cobrinha (tempos)' },
                { key: 'solido',   label: 'Fundo sólido' },
              ] as { key: keyof typeof animPrefs; label: string }[]).map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={animPrefs[key]}
                    onChange={e => setAnimPrefs({ ...animPrefs, [key]: e.target.checked })}
                    className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs text-muted leading-tight">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-3 flex flex-col gap-2">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-1.5 text-xs rounded bg-surface text-muted hover:bg-line hover:text-ink transition-colors"
              >
                Restaurar padrões
              </button>
            ) : (
              <>
                <p className="text-xs text-muted text-center">Restaurar régua da folha também?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setTextSize(DEFAULTS.textSize)
                      setChordSize(DEFAULTS.chordSize)
                      setChordColor(DEFAULTS.chordColor)
                      setTwoColumns(DEFAULTS.twoColumns)
                      setColumnFlow(DEFAULTS.columnFlow)
                      setPageMargin(DEFAULTS.pageMargin)
                      setColumnGap(DEFAULTS.columnGap)
                      if (activeTabId && activeTab) {
                        const allBlockIds = activeTab.blocks.filter(b => b.type !== 'header').map(b => b.id)
                        if (allBlockIds.length > 0) joinLinesUpToPosition(activeTabId, allBlockIds, 99999)
                      }
                      setConfirmReset(false)
                    }}
                    className="flex-1 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => {
                      setTextSize(DEFAULTS.textSize)
                      setChordSize(DEFAULTS.chordSize)
                      setChordColor(DEFAULTS.chordColor)
                      setTwoColumns(DEFAULTS.twoColumns)
                      setColumnFlow(DEFAULTS.columnFlow)
                      setPageMargin(DEFAULTS.pageMargin)
                      setColumnGap(DEFAULTS.columnGap)
                      setConfirmReset(false)
                    }}
                    className="flex-1 py-1.5 text-xs rounded bg-surface text-muted hover:bg-line transition-colors"
                  >
                    Não
                  </button>
                </div>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-faint hover:text-muted transition-colors text-center"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Metronome audio ──────────────────────────────────────────────────────────

function playMetronomeClick(ctx: AudioContext, isDownbeat: boolean, volume: number) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = isDownbeat ? 1050 : 800
  const now = ctx.currentTime
  gain.gain.setValueAtTime(isDownbeat ? volume * 0.9 : volume * 0.45, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  osc.start(now)
  osc.stop(now + 0.06)
}

// ─── MetronomeWidget — floating draggable ─────────────────────────────────────

export function MetronomeWidget() {
  const { activeTab, nowPlayingTitle } = useEditor()

  const normalize = (s: string) => s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')

  const isActiveTabPlaying = !!(
    nowPlayingTitle &&
    activeTab?.name &&
    normalize(activeTab.name) === normalize(nowPlayingTitle)
  )

  const sd = isActiveTabPlaying ? activeTab?.syncData : undefined
  const bpm         = sd?.bpm         ?? 120
  const beatsPerBar = sd?.beatsPerBar ?? 4
  const progressMs  = sd?.extProgressMs ?? 0
  const progressAt  = sd?.extProgressAt ?? 0
  const isPlaying   = sd?.extIsPlaying  ?? false
  const offsetSecs  = sd?.offsetSeconds     ?? 0
  const extConnected = sd?.extIsPlaying !== undefined

  // Widget state
  const [activeBeat, setActiveBeat]     = useState(0)
  const [flash, setFlash]               = useState(false)
  const [enabled, setEnabled]           = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [metroVol, setMetroVol]         = useState(0.6)
  const [minimized, setMinimized]       = useState(false)

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  // Ancora abaixo do botão de ferramentas na coluna direita
  useEffect(() => {
    function calcPos() {
      const anchor = document.querySelector('[data-tools-btn]') as HTMLElement | null
      if (!anchor) { setPos({ x: window.innerWidth - 220, y: 200 }); return }

      const r = anchor.getBoundingClientRect()
      setPos({ x: Math.round(r.right - 200), y: Math.round(r.bottom + 48) })
    }
    // Aguarda o DOM estabilizar (botões condicionais podem não estar prontos no mount)
    const t = setTimeout(calcPos, 50)
    return () => clearTimeout(t)
  }, [])

  const onDragDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const cur = pos ?? { x: window.innerWidth - 220, y: 80 }
    dragRef.current = { mx: e.clientX, my: e.clientY, px: cur.x, py: cur.y }
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return
      const METRO_W = 200, METRO_H = 160, TOP_SAFE = 100
      const nx = dragRef.current.px + ev.clientX - dragRef.current.mx
      const ny = dragRef.current.py + ev.clientY - dragRef.current.my
      setPos({
        x: Math.max(0, Math.min(nx, window.innerWidth - METRO_W)),
        y: Math.max(TOP_SAFE, Math.min(ny, window.innerHeight - METRO_H)),
      })
    }
    function onUp() {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [pos])

  // RAF refs
  const rafRef        = useRef<number>(0)
  const lastBeatRef   = useRef<number>(-2)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioCtxRef   = useRef<AudioContext | null>(null)

  const syncDataRef   = useRef(sd);          syncDataRef.current   = sd
  const bpmRef        = useRef(bpm);        bpmRef.current        = bpm
  const bpbRef        = useRef(beatsPerBar);bpbRef.current        = beatsPerBar
  const progMsRef     = useRef(progressMs); progMsRef.current     = progressMs
  const progAtRef     = useRef(progressAt); progAtRef.current     = progressAt
  const isPlayRef     = useRef(isPlaying);  isPlayRef.current     = isPlaying
  const offRef        = useRef(offsetSecs); offRef.current        = offsetSecs
  const enabledRef    = useRef(true);       enabledRef.current    = enabled
  const soundRef      = useRef(false);      soundRef.current      = soundEnabled
  const metroVolRef   = useRef(0.6);        metroVolRef.current   = metroVol

  function toggleSound() {
    if (!soundEnabled) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    }
    setSoundEnabled(v => !v)
  }

  useEffect(() => {
    function tick() {
      if (!enabledRef.current) { rafRef.current = requestAnimationFrame(tick); return }
      const now = Date.now()
      const rawMs = isPlayRef.current
        ? progMsRef.current + (now - progAtRef.current)
        : progMsRef.current
      const currentMs = rawMs - (syncDataRef.current?.syncLatencyMs ?? 0)
      const adjustedMs = currentMs - offRef.current * 1000
      if (adjustedMs < 0) {
        if (lastBeatRef.current !== -1) { lastBeatRef.current = -1; setActiveBeat(0); setFlash(false) }
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const beat = Math.floor(adjustedMs / (60000 / bpmRef.current)) % bpbRef.current
      if (beat !== lastBeatRef.current) {
        lastBeatRef.current = beat
        setActiveBeat(beat)
        setFlash(true)
        if (soundRef.current && audioCtxRef.current)
          playMetronomeClick(audioCtxRef.current, beat === 0, metroVolRef.current)
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
        flashTimerRef.current = setTimeout(() => setFlash(false), 100)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(rafRef.current); if (flashTimerRef.current) clearTimeout(flashTimerRef.current) }
  }, [])

  if (!pos) return null
  if (!isActiveTabPlaying) return null

  const dots = Math.min(beatsPerBar, 8)

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 50,
        width: 200,
        background: '#18181b',
        border: '1px solid #3f3f46',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Título / drag handle */}
      <div
        onMouseDown={onDragDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px 6px',
          cursor: 'grab',
          borderBottom: minimized ? 'none' : '1px solid #27272a',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Metrônomo
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setMinimized(v => !v)}
            title={minimized ? 'Expandir' : 'Minimizar'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: '2px 4px', borderRadius: 4, display: 'flex' }}
          >
            {minimized ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
          </button>
        </div>
      </div>

      {!minimized && (
        <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Beat dots + BPM + toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, opacity: enabled ? 1 : 0.3 }}>
              {Array.from({ length: dots }, (_, i) => {
                const isActive = enabled && i === activeBeat
                const isDown   = i === 0
                return (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: isActive
                      ? (flash ? '#fff' : (isDown ? '#4ade80' : '#22c55e'))
                      : (isDown ? '#52525b' : '#3f3f46'),
                    boxShadow: isActive && flash ? '0 0 6px #22c55e' : 'none',
                    transition: 'background 40ms',
                  }} />
                )
              })}
            </div>
            {/* BPM */}
            <span style={{ fontSize: 10, color: '#71717a', fontVariantNumeric: 'tabular-nums', flex: 1, textAlign: 'right', opacity: enabled ? 1 : 0.35 }}>
              {bpm} <span style={{ color: '#52525b' }}>♩ {beatsPerBar}/4</span>
            </span>
          </div>

          {/* Controles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Ligar/desligar */}
            <button onClick={() => setEnabled(v => !v)} title={enabled ? 'Pausar' : 'Ligar'}
              style={{ background: enabled ? '#22c55e18' : 'none', border: '1px solid ' + (enabled ? '#22c55e44' : '#3f3f46'), borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: enabled ? '#22c55e' : '#52525b', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600 }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42A6.92 6.92 0 0 1 19 12c0 3.87-3.13 7-7 7A7 7 0 0 1 5 12c0-2.28 1.09-4.3 2.79-5.61L6.37 4.97A9 9 0 0 0 3 12a9 9 0 0 0 18 0c0-2.74-1.23-5.18-3.17-6.83z"/>
              </svg>
              {enabled ? 'On' : 'Off'}
            </button>
            {/* Som */}
            <button onClick={toggleSound} title={soundEnabled ? 'Mudo' : 'Som'}
              style={{ background: soundEnabled ? '#22c55e18' : 'none', border: '1px solid ' + (soundEnabled ? '#22c55e44' : '#3f3f46'), borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: soundEnabled ? '#22c55e' : '#52525b', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600 }}>
              {soundEnabled
                ? <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                : <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" opacity="0.5"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l2 2L21 18.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
              }
              Som
            </button>
          </div>

          {/* Volume do metrônomo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Metrônomo</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill={soundEnabled ? '#22c55e' : '#3f3f46'}>
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input type="range" min={0} max={1} step={0.05} value={metroVol}
                onChange={e => setMetroVol(parseFloat(e.target.value))}
                disabled={!soundEnabled}
                style={{ flex: 1, height: 3, accentColor: '#22c55e', cursor: soundEnabled ? 'pointer' : 'default', opacity: soundEnabled ? 1 : 0.3 }}
              />
              <span style={{ fontSize: 9, color: '#52525b', width: 22, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(metroVol * 100)}
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
