'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

export type DevClock = { isPlaying: boolean; progressMs: number; progressAt: number }

export const DEV_BPM          = 120
export const DEV_BEATS_PER_BAR = 4
export const BAR_DUR_MS        = (60 / DEV_BPM) * DEV_BEATS_PER_BAR * 1000  // 2000ms

export function clockPosMs(c: DevClock): number {
  return c.isPlaying ? c.progressMs + (Date.now() - c.progressAt) : c.progressMs
}

type DevPlayerCtxValue = {
  clock: DevClock;              setClock:              (c: DevClock) => void
  offsetMs: number;             setOffsetMs:           (ms: number) => void
  bpm: number;                  setBpm:                (b: number) => void
  num: number;                  setNum:                (n: number) => void
  den: number;                  setDen:                (d: number) => void
  extDurationMs: number;    setExtDurationMs:  (ms: number) => void
  refreshSignal: number
  extIsPlaying: boolean
  extConnected: boolean;    setExtConnected:   (v: boolean) => void
  metronomeEnabled: boolean;    setMetronomeEnabled:   (v: boolean) => void
  onExtPlayingChange: (playing: boolean) => void
  onPlayPause: (action: 'play' | 'pause') => void
  extPosRef:       React.MutableRefObject<number>
  isExtPlayingRef: React.MutableRefObject<boolean>
}

const PlayerContext = createContext<DevPlayerCtxValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [clock,             setClock]             = useState<DevClock>({ isPlaying: false, progressMs: 0, progressAt: 0 })
  const [offsetMs,          setOffsetMs]          = useState(0)
  const [bpm,               setBpm]               = useState(DEV_BPM)
  const [num,               setNum]               = useState(DEV_BEATS_PER_BAR)
  const [den,               setDen]               = useState(4)
  const [extDurationMs, setExtDurationMs] = useState(0)
  const [refreshSignal,     setRefreshSignal]     = useState(0)
  const [extIsPlaying,  setExtIsPlaying]  = useState(false)
  const [extConnected,  setExtConnected]  = useState(false)
  const [metronomeEnabled,  setMetronomeEnabled]  = useState(false)
  const extPosRef          = useRef(0)
  const isExtPlayingRef    = useRef(false)
  const extConnectedRef    = useRef(false)
  extConnectedRef.current  = extConnected

  const onExtPlayingChange = useCallback((playing: boolean) => {
    setExtIsPlaying(playing)
    isExtPlayingRef.current = playing
    setClock(prev => {
      if (prev.isPlaying === playing) return prev
      const pos = playing ? prev.progressMs : (prev.progressMs + (Date.now() - prev.progressAt))
      return { isPlaying: playing, progressMs: pos, progressAt: Date.now() }
    })
  }, [])

  // Player externo removido (era Spotify): o botão de play controla apenas
  // o clock local (animação da cifra + metrônomo).
  const onPlayPause = useCallback((action: 'play' | 'pause') => {
    onExtPlayingChange(action === 'play')
  }, [onExtPlayingChange])

  const value = useMemo<DevPlayerCtxValue>(() => ({
    clock, setClock, offsetMs, setOffsetMs,
    bpm, setBpm, num, setNum, den, setDen,
    extDurationMs, setExtDurationMs,
    refreshSignal, extIsPlaying,
    extConnected, setExtConnected,
    metronomeEnabled, setMetronomeEnabled,
    onExtPlayingChange, onPlayPause,
    extPosRef, isExtPlayingRef,
  }), [clock, offsetMs, bpm, num, den, extDurationMs, refreshSignal, extIsPlaying, extConnected, metronomeEnabled, onExtPlayingChange, onPlayPause])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}
