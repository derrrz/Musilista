'use client'

import { useEffect, useRef, useState } from 'react'
import { SyncData } from './types'
import { barIndexToMs } from './arrangement'
import { PracticeLoop } from './useSequenceEngine'
import { usePlayer } from '../_context/PlayerContext'

type TimeSigMap = Record<string, { num: number; den: number }>

type PracticeState = {
  loop: PracticeLoop
  repIdx: number       // 1-based: 1 = primeiro rep via relógio de parede
  wallRepStart: number // Date.now() quando o rep atual começou
}

/**
 * Relógio de sincronização RAF separado da renderização da grade.
 *
 * Lê `timings` e `syncData` via refs (sempre atuais, sem re-render no RAF),
 * e expõe `activeBarKey` e `beatPulse` como estado React (atualizado apenas
 * quando o valor muda, para minimizar re-renders).
 *
 * Separar este hook de ChordChartView garante que reestruturações do componente
 * de grade não interrompam o clock de sync.
 */
export function useSyncClock(
  timings: Map<string, { startBar: number; endBar: number }[]>,
  syncData: SyncData | undefined,
  isSynced: boolean,
  practiceLoops: PracticeLoop[],
  barCumTimes?: number[] | null,
  timeSigChanges?: TimeSigMap,
) {
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null)
  const [beatPulse, setBeatPulse]       = useState<{ key: string; bpm: number; beatsPerBar: number; elapsedMs: number } | null>(null)
  // Progresso dentro do bar ativo (0–1) — ref para evitar re-renders por frame
  const activeBarProgressRef = useRef(0)

  // BPM do player — fonte única de verdade para timing do metrônomo
  const { bpm: playerBpm } = usePlayer()
  const playerBpmRef = useRef(playerBpm)
  playerBpmRef.current = playerBpm

  // Refs para que o RAF sempre leia os dados mais recentes sem ser recriado
  const timingsRef        = useRef(timings)
  const syncDataRef       = useRef(syncData)
  const isSyncedRef       = useRef(isSynced)
  const practiceLoopsRef  = useRef(practiceLoops)
  const barCumTimesRef    = useRef(barCumTimes)
  const timeSigChangesRef = useRef(timeSigChanges)
  const lastBeatRef       = useRef('')
  const prevFoundRef      = useRef<string | null>(null)
  const lastFoundRef      = useRef<string | null>(null)
  const practiceStateRef  = useRef<PracticeState | null>(null)
  const wasPlayingRef     = useRef(false)

  timingsRef.current        = timings
  syncDataRef.current       = syncData
  isSyncedRef.current       = isSynced
  practiceLoopsRef.current  = practiceLoops
  barCumTimesRef.current    = barCumTimes
  timeSigChangesRef.current = timeSigChanges

  useEffect(() => {
    let rafId: number
    const tick = () => {
      const sd = syncDataRef.current
      if (!sd || (!isSyncedRef.current && !sd.forceSynced)) {
        lastFoundRef.current = null
        setActiveBarKey(null)
        practiceStateRef.current = null
        prevFoundRef.current = null
        if (lastBeatRef.current !== '') { lastBeatRef.current = ''; setBeatPulse(null) }
        rafId = requestAnimationFrame(tick)
        return
      }

      const now = Date.now()
      const wasPlaying = wasPlayingRef.current
      wasPlayingRef.current = !!(sd.extIsPlaying)
      const rawMs = sd.extIsPlaying
        ? (sd.extProgressMs ?? 0) + (now - (sd.extProgressAt ?? now))
        : (sd.extProgressMs ?? 0)
      // Em modo forceSynced (clock do player) não aplica latency — cobrinha segue o clock direto
      const currentMs = sd.forceSynced ? rawMs : rawMs - (sd.syncLatencyMs ?? 0)

      let found: string | null = null
      let foundStartMs = 0
      let foundEndMs   = 0

      const bct = barCumTimesRef.current
      outer: for (const [key, ranges] of timingsRef.current) {
        for (const { startBar, endBar } of ranges) {
          const startMs = barIndexToMs(sd, startBar, bct)
          const endMs   = barIndexToMs(sd, endBar,   bct)
          if (currentMs >= startMs && currentMs < endMs) {
            found = key; foundStartMs = startMs; foundEndMs = endMs; break outer
          }
        }
      }

      // Progresso dentro do bar ativo (0–1)
      if (found !== null && foundEndMs > foundStartMs) {
        activeBarProgressRef.current = Math.max(0, Math.min(1, (currentMs - foundStartMs) / (foundEndMs - foundStartMs)))
      } else {
        activeBarProgressRef.current = 0
      }

      // ── Loop de prática via relógio de parede ─────────────────────────────
      // Quando o faixa termina a zona de loop (ou para dentro dela), continuamos
      // animando as repetições restantes com base no tempo de parede.

      const matchingLoop = found !== null
        ? practiceLoopsRef.current.find(pl => pl.keys.includes(found!))
        : undefined
      const isInLoopZone = matchingLoop !== undefined

      // faixa tocando ativamente na zona → encerra modo prática (usuário voltou ao início)
      if (isInLoopZone && sd.extIsPlaying) {
        if (practiceStateRef.current) practiceStateRef.current = null
      }

      // Iniciar prática em dois cenários:
      // 1. faixa saiu da zona (found=null, anterior estava na zona)
      // 2. faixa parou/terminou dentro da zona (!isPlaying, found ainda na zona)
      if (!practiceStateRef.current) {
        let triggerLoop: PracticeLoop | undefined
        if (found === null && prevFoundRef.current !== null) {
          triggerLoop = practiceLoopsRef.current.find(pl => pl.keys.includes(prevFoundRef.current!))
        } else if (isInLoopZone && !sd.extIsPlaying && wasPlaying) {
          triggerLoop = matchingLoop
        }
        if (triggerLoop && triggerLoop.loopCount > 1) {
          practiceStateRef.current = { loop: triggerLoop, repIdx: 1, wallRepStart: now }
        }
      }

      // Substituir found por célula de prática via relógio de parede
      if (practiceStateRef.current && !(isInLoopZone && sd.extIsPlaying)) {
        const ps = practiceStateRef.current
        const firstCell  = ps.loop.cells[0]
        const lastCell   = ps.loop.cells[ps.loop.cells.length - 1]
        const repStartMs = barIndexToMs(sd, firstCell.startBar, bct)
        const repEndMs   = barIndexToMs(sd, lastCell.endBar,   bct)
        const repDurMs   = Math.max(1, repEndMs - repStartMs)
        const elapsed    = now - ps.wallRepStart

        // Avançar rep se necessário
        if (elapsed >= repDurMs) {
          const nextRep = ps.repIdx + 1
          if (nextRep < ps.loop.loopCount) {
            practiceStateRef.current = { ...ps, repIdx: nextRep, wallRepStart: ps.wallRepStart + repDurMs }
          } else {
            practiceStateRef.current = null
          }
        }

        // Encontrar célula ativa no rep atual
        if (practiceStateRef.current) {
          const psCurr   = practiceStateRef.current
          const elapsed2 = now - psCurr.wallRepStart
          for (const cell of psCurr.loop.cells) {
            const cellRelStart = barIndexToMs(sd, cell.startBar, bct) - repStartMs
            const cellRelEnd   = barIndexToMs(sd, cell.endBar,   bct) - repStartMs
            if (elapsed2 >= cellRelStart && elapsed2 < cellRelEnd) {
              found        = cell.key
              foundStartMs = psCurr.wallRepStart + cellRelStart
              break
            }
          }
        }
      }

      prevFoundRef.current = found

      // Gap (linha deletada): a cobrinha nunca para — pula para o próximo chip.
      // Só ativa após o offset expirar; antes disso a cobrinha fica parada.
      const offsetMs = (sd.offsetSeconds ?? 0) * 1000
      if (found === null && currentMs >= offsetMs) {
        let nextKey: string | null = null
        let nextStartMs = Infinity
        for (const [key, ranges] of timingsRef.current) {
          for (const { startBar } of ranges) {
            const sMs = barIndexToMs(sd, startBar, bct)
            if (sMs > currentMs && sMs < nextStartMs) { nextStartMs = sMs; nextKey = key }
          }
        }
        found = nextKey ?? lastFoundRef.current
        // Beat pulse inicia do zero quando o chip real começar
        if (found !== null && nextKey !== null) foundStartMs = nextStartMs
      }

      if (found !== null) lastFoundRef.current = found

      setActiveBarKey(prev => prev === found ? prev : found)

      const isInPractice = practiceStateRef.current !== null && found !== null
      // Só anima o beat pulse quando o faixa está realmente no chip (não em gap)
      const chipHasStarted = foundStartMs <= currentMs
      if (found !== null && chipHasStarted && (sd.extIsPlaying || isInPractice)) {
        // Resolve beatsPerBar for current cell (respects timeSigChanges)
        const cellTs = timeSigChangesRef.current?.[found]
        const activeBeatsPerBar = cellTs ? cellTs.num : (sd.beatsPerBar ?? 4)
        const activeBpm = playerBpmRef.current || sd.bpm
        const beatDurMs = 60000 / activeBpm
        const elapsed   = isInPractice ? (now - foundStartMs) : (currentMs - foundStartMs)
        const beatIdx   = Math.floor(elapsed / beatDurMs)
        const elapsedMs = elapsed - beatIdx * beatDurMs
        const beatKey   = `${found}:${beatIdx}`
        if (beatKey !== lastBeatRef.current) {
          lastBeatRef.current = beatKey
          setBeatPulse({ key: beatKey, bpm: activeBpm, beatsPerBar: activeBeatsPerBar, elapsedMs })
        }
      } else if (lastBeatRef.current !== '') {
        lastBeatRef.current = ''
        setBeatPulse(null)
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, []) // sem deps — lê sempre via refs

  return { activeBarKey, beatPulse, activeBarProgressRef }
}
