import { Block, ArrangementEntry, SyncData } from './types'

/** Número de compassos por linha no grid do ChordChartView. Protocolo compartilhado com useSequenceEngine. */
export const BARS_PER_ROW = 4

export function extractBarsFromBlock(block: Block): string[][] {
  const textSection = block.sections.find(
    s => s.type === 'LYRICS_CHORDS' || s.type === 'CHORDS_ONLY',
  )
  if (!textSection) return []

  const lines = textSection.lines
  const bars: string[][] = []
  const isChordsOnly = textSection.type === 'CHORDS_ONLY'

  for (const line of lines) {
    const chords = line.chords
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(c => c.value)
      .filter(Boolean)

    if (isChordsOnly) {
      for (const chord of chords) bars.push([chord])
    } else if (line.continuation && bars.length > 0) {
      bars[bars.length - 1].push(...chords)
    } else if (chords.length > 0) {
      bars.push(chords)
    }
  }

  return bars
}

export function totalBarsFromArrangement(arrangement: ArrangementEntry[], blocks: Block[]): number {
  return arrangement.reduce((sum, entry) => {
    const block = blocks.find(b => b.id === entry.blockId)
    if (!block) return sum
    return sum + extractBarsFromBlock(block).length * entry.repeatCount
  }, 0)
}

export function totalBarsFromBlocks(blocks: Block[]): number {
  return blocks
    .filter(b => b.type !== 'header')
    .sort((a, b) => a.order - b.order)
    .reduce((sum, b) => sum + extractBarsFromBlock(b).length, 0)
}

export function detectArrangement(blocks: Block[]): ArrangementEntry[] {
  return blocks
    .filter(b => b.type !== 'header')
    .sort((a, b) => a.order - b.order)
    .filter(b => extractBarsFromBlock(b).length > 0)
    .map(block => ({
      id: `auto-${block.id}`,
      blockId: block.id,
      repeatCount: 1,
    }))
}

// Retorna array de "células fundidas" — cada elemento = N bars que ficam num quadro visual
export function mergedBarsForSection(
  bars: string[][],
  barsPerCell: number,
): string[][][] {
  const n = Math.max(1, barsPerCell)
  const result: string[][][] = []
  for (let i = 0; i < bars.length; i += n)
    result.push(bars.slice(i, i + n))
  return result
}

// Converte índice de bar (na sequência global da cifra) para posição em ms no player.
// barCumTimes[i] = segundos acumulados até o início do bar i (relativo a offsetSeconds=0).
// Quando fornecido e sem spotifyBars, usa os tempos pré-computados por buildBarCumTimes.
export function barIndexToMs(syncData: SyncData, barIndex: number, barCumTimes?: number[] | null): number {
  const offset = syncData.spotifyBarOffset ?? 0
  if (syncData.spotifyBars?.length) {
    const realIdx = offset + barIndex
    const lo      = Math.floor(realIdx)
    const frac    = realIdx - lo
    const barLo   = syncData.spotifyBars[lo]
    if (frac === 0) {
      if (barLo) return Math.round((syncData.offsetSeconds + barLo.start) * 1000)
    } else {
      const barHi = syncData.spotifyBars[lo + 1]
      if (barLo && barHi) {
        const t = syncData.offsetSeconds + barLo.start + frac * (barHi.start - barLo.start)
        return Math.round(t * 1000)
      }
      if (barLo) return Math.round((syncData.offsetSeconds + barLo.start) * 1000)
    }
  }
  if (barCumTimes && barIndex < barCumTimes.length) {
    return Math.round((syncData.offsetSeconds + barCumTimes[barIndex]) * 1000)
  }
  const barDur = (60 / syncData.bpm) * syncData.beatsPerBar
  return Math.round((syncData.offsetSeconds + barIndex * barDur) * 1000)
}

/**
 * Pré-computa tempos cumulativos de início de cada bar (em segundos, relativo a offsetSeconds=0)
 * levando em conta mudanças de fórmula de compasso por célula do arranjo.
 * Retorna null se não há timeSigChanges (usar fórmula uniforme é suficiente).
 *
 * Invariante: barCumTimes[i] = soma das durações dos bars 0..i-1.
 * Usado apenas no modo BPM (sem spotifyBars).
 */
export function buildBarCumTimes(
  sequence: DebugEntry[],
  timeSigChanges: Record<string, { num: number; den: number }> | undefined,
  bpm: number,
  globalNum: number,
  globalDen: number,
): number[] | null {
  if (!timeSigChanges || Object.keys(timeSigChanges).length === 0) return null
  const maxBar = sequence.reduce((m, e) => Math.max(m, e.endBar), 0)
  if (maxBar === 0) return null

  const defaultDur = globalNum * (4 / globalDen) * (60 / bpm)
  const durs = new Array<number>(maxBar).fill(defaultDur)

  for (const entry of sequence) {
    // Strip -p2 suffix to look up timeSigChanges under the base entry id
    const rawId  = entry.key.split(':')[0]
    const baseId = rawId.endsWith('-p2') ? rawId.slice(0, -3) : rawId
    // Find effective time sig: scan from ci=0 to entry.ci within this entry
    let num = globalNum, den = globalDen
    for (let i = 0; i <= entry.ci; i++) {
      const ts = timeSigChanges[`${baseId}:${i}`]
      if (ts) { num = ts.num; den = ts.den }
    }
    const barDur = num * (4 / den) * (60 / bpm)
    for (let b = entry.startBar; b < entry.endBar; b++) durs[b] = barDur
  }

  const cum = new Array<number>(maxBar + 1)
  cum[0] = 0
  for (let i = 0; i < maxBar; i++) cum[i + 1] = cum[i] + durs[i]
  return cum
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─── Pulsador sequence ────────────────────────────────────────────────────────

/**
 * Uma entrada na sequência linear de reprodução gerada por buildPulsadorSequence.
 * key = "entryId:ci" (cellIndex pós-merge); rep e loopRep identificam a passagem.
 * startBar/endBar são índices comprimidos no tempo global (sem lacunas por deletados).
 */
export interface DebugEntry {
  key: string       // "entryId:ci"
  label: string
  rep: number       // 0-based (repetição da seção inteira via repeatCount)
  loopRep: number   // 0-based (passagem dentro da região de loop; 0 se sem loop)
  ci: number        // 0-based
  startBar: number
  endBar: number
  barId?: number    // número 1-based do filledBarIndex
}

/**
 * Descrição de uma seção para o motor de sequência.
 * loopEndCell e loopCount devem ser derivados de LoopMarker por useSequenceEngine
 * (única responsável pela conversão rawBarEnd → cellIndex).
 * sectionStartBar é informativo e não é usado internamente por buildPulsadorSequence
 * (o contador interno `bar` é o que controla o timing).
 */
export type SequenceSection = {
  entryId: string
  label: string
  bars: string[][]
  repeatCount: number
  barsPerCell: number
  sectionStartBar: number
  totalCells?: number  // total de células visíveis (inclui addedCells e overrides além do range original)
  loopEndCell?: number  // última célula (0-based) da região de loop; undefined = sem loop
  loopCount?: number   // quantas vezes repetir cells 0..loopEndCell; undefined/1 = sem expansão
}

/**
 * Produz a sequência linear completa de compassos na ordem exata de reprodução.
 * Itera seção → repetição → célula; o array sai em ordem cronológica sem sort.
 * Apenas compassos presentes em filledBarIndex (com acordes) são incluídos nas
 * entradas do array, mas TODOS os compassos (incluindo vazios) avançam o contador
 * `bar` para preservar o posicionamento correto na linha do tempo do Spotify.
 * Isso evita que acordes subsequentes apareçam cedo demais após um compasso vazio.
 */
export function buildPulsadorSequence(
  sections: SequenceSection[],
  filledBarIndex: Map<string, number>,
): DebugEntry[] {
  const seq: DebugEntry[] = []
  let bar = 0   // avança para TODOS os compassos (vazios ou não) para manter posições inteiras

  for (const { entryId, label, bars, repeatCount, barsPerCell, totalCells, loopEndCell, loopCount } of sections) {
    const cells = mergedBarsForSection(bars, barsPerCell)
    const iterLimit = Math.max(cells.length, totalCells ?? 0)
    const hasLoop = loopEndCell !== undefined && loopCount !== undefined && loopCount > 1 && loopEndCell < iterLimit

    for (let rep = 0; rep < repeatCount; rep++) {
      if (hasLoop) {
        for (let loopRep = 0; loopRep < loopCount!; loopRep++) {
          for (let ci = 0; ci <= loopEndCell!; ci++) {
            const key = `${entryId}:${ci}`
            const startBar = bar
            bar += barsPerCell
            if (!filledBarIndex.has(key)) continue
            seq.push({ key, label, rep, loopRep, ci, startBar, endBar: bar, barId: filledBarIndex.get(key) })
          }
        }
        for (let ci = loopEndCell! + 1; ci < iterLimit; ci++) {
          const key = `${entryId}:${ci}`
          const startBar = bar
          bar += barsPerCell
          if (!filledBarIndex.has(key)) continue
          seq.push({ key, label, rep, loopRep: 0, ci, startBar, endBar: bar, barId: filledBarIndex.get(key) })
        }
      } else {
        for (let ci = 0; ci < iterLimit; ci++) {
          const key = `${entryId}:${ci}`
          const startBar = bar
          bar += barsPerCell
          if (!filledBarIndex.has(key)) continue
          seq.push({ key, label, rep, loopRep: 0, ci, startBar, endBar: bar, barId: filledBarIndex.get(key) })
        }
      }
    }
  }
  return seq
}
