'use client'

import { useMemo } from 'react'
import { Block, ArrangementEntry, LoopMarker } from './types'
import {
  extractBarsFromBlock,
  detectArrangement,
  mergedBarsForSection,
  buildPulsadorSequence,
  BARS_PER_ROW,
  DebugEntry,
  SequenceSection,
} from './arrangement'

// ─── Pattern labeling ─────────────────────────────────────────────────────────
// Vivem aqui porque o engine é o único lugar onde padrões são identificados.

const PATTERN_COLORS = [
  '#6366f1', // A — indigo
  '#0284c7', // B — blue
  '#16a34a', // C — green
  '#d97706', // D — amber
  '#9333ea', // E — purple
  '#db2777', // F — pink
  '#059669', // G — emerald
  '#0891b2', // H — cyan
]

function sectionKey(bars: string[][]): string {
  return bars.map(bar => bar.join(',')).join('|')
}

function buildPatternMeta(
  sections: Array<{ block: Block; bars: string[][] }>,
): Array<{ label: string; color: string }> {
  const seen = new Map<string, { label: string; color: string }>()
  let next = 0
  return sections.map(({ block, bars }) => {
    if (block.type === 'intro') return { label: block.name || 'Intro', color: '#6366f1' }
    if (block.type === 'solo')  return { label: block.name || 'Solo',  color: '#d97706' }
    const key = sectionKey(bars)
    if (!seen.has(key)) {
      seen.set(key, {
        label: String.fromCharCode(65 + next),
        color: PATTERN_COLORS[next % PATTERN_COLORS.length],
      })
      next++
    }
    const meta = seen.get(key)!
    return { label: block.name || meta.label, color: meta.color }
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Uma seção computada pelo engine — tudo que um consumidor precisa para renderizar
 * e para participar da sequência de reprodução.
 */
export type EngineSection = {
  block: Block
  entryId: string
  /** Chave React estável: `entry.id ?? index` */
  entryKey: string
  repeatCount: number
  barsPerCell: number
  /** Bars raw extraídos do bloco (antes de barsPerCell). */
  bars: string[][]
  /** Células visuais — resultado de mergedBarsForSection(bars, barsPerCell). */
  cells: string[][][]
  /**
   * Total de células visíveis: inclui addedCells e células extras criadas por
   * overrides além do range original. Usado como limite do loop de renderização.
   */
  effectiveTotal: number
  /** Label de padrão: "A", "B", "Intro", "Solo", etc. */
  label: string
  color: string
  /**
   * Bar index raw (não comprimido) onde esta seção começa na sequência global.
   * Usado apenas como fallback de seek; prefira sectionFirstBars para seek real.
   */
  sectionStartBar: number
  // Campos de configuração visual — espelham ArrangementEntry para evitar lookups no render
  addedCells: number
  deletedRows: number[]
  hideEmptyBars: boolean
  /** 0 = primeira passada normal; 1 = segunda passada gerada por loopBackToEntryId */
  passIndex: 0 | 1
  /** entryId da entrada original do arrangement (sem sufixo -p2). */
  baseEntryId: string
  /** entryId do alvo do loop (só presente em seções de primeira passada com loopBack). */
  loopBackToEntryId?: string
}

/**
 * Zona de loop para prática: a seção só toca uma vez no áudio, mas o pulsador
 * deve continuar animando via relógio de parede para as repetições restantes.
 */
export type PracticeLoop = {
  /** Todas as chaves "entryId:ci" que pertencem à zona do loop (rep 0). */
  keys: string[]
  /** Células da zona do loop na rep 0, em ordem, com seus bar indices. */
  cells: { key: string; startBar: number; endBar: number }[]
  /** Quantas vezes a zona deve ser repetida no total (inclui a 1ª passagem real). */
  loopCount: number
}

export type SequenceEngine = {
  /** Arrangement efetivo (manual ou detectado automaticamente). */
  effectiveArr: ArrangementEntry[]
  /** Uma EngineSection por entrada de arrangement com bars > 0. */
  sections: EngineSection[]
  /**
   * Mapa chave → posição 1-based na sequência linear (rep 0).
   * Chave: `"entryId:cellIndex"` (cellIndex pós-merge).
   */
  filledBarIndex: Map<string, number>
  /** Sequência cronológica completa de reprodução — order: seção → rep → célula. */
  sequence: DebugEntry[]
  /**
   * Mapa chave → intervalos de tempo em unidades de "bar index comprimido".
   * Agrega TODAS as ocorrências de uma célula (todas as reps e loops).
   * Usado pelo relógio RAF no modo faixa (startBar = posição real na música).
   */
  timings: Map<string, { startBar: number; endBar: number }[]>
  /**
   * Mapa chave → intervalos em unidades sequenciais de chip (índice i → [i, i+1)).
   * Independe de células vazias ou barsPerCell. Usado no modo DEV (forceSynced)
   * para garantir que cobrinha e ChipStrip estejam sempre sincronizados.
   */
  devTimings: Map<string, { startBar: number; endBar: number }[]>
  /**
   * Mapa entryId → startBar da primeira ocorrência na sequência.
   * Usado pelo seek ao clicar no header de seção.
   */
  sectionFirstBars: Map<string, number>
  /**
   * Bar indices onde a repetição (rep) de uma seção incrementa.
   * Usado para renderizar separadores visuais entre repetições.
   */
  repBoundaries: number[]
  /**
   * Zonas de loop de prática: seções com loopCount > 1 cujas repetições extras
   * serão animadas via relógio de parede (não via extBars).
   */
  practiceLoops: PracticeLoop[]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Motor de sequência compartilhado entre ChordChartView e DebugConsole.
 *
 * Computa UMA vez (via useMemo) todo o pipeline de dados:
 *   sections → filledBarIndex → sequence → timings + sectionFirstBars + repBoundaries
 *
 * Todos os componentes consumidores DEVEM usar este hook em vez de recomputar
 * qualquer parte do pipeline — divergência entre consumidores é a causa mais
 * comum de bugs no pulsador.
 */
export function useSequenceEngine(
  blocks: Block[],
  arrangement: ArrangementEntry[] | undefined,
  loopMarkers: Record<string, LoopMarker>,
  chordOverrides: Record<string, string[]>,
  extraChords: Record<string, string[]>,
): SequenceEngine {
  return useMemo(() => {
    const sorted = blocks.slice().sort((a, b) => a.order - b.order)

    const effectiveArr: ArrangementEntry[] = arrangement?.length
      ? arrangement
      : detectArrangement(blocks)

    // ── Step 1: sections ──────────────────────────────────────────────────────

    type RawItem = {
      block: Block
      entry: ArrangementEntry
      entryId: string
      entryKey: string
      bars: string[][]
      passIndex: 0 | 1
      baseEntryId: string
    }

    const rawItems: RawItem[] = effectiveArr
      .map((entry, i) => {
        const block = sorted.find(b => b.id === entry.blockId)
        if (!block) return null
        const bars = extractBarsFromBlock(block)
        // Inclui entry sem bars se tiver addedCells (bloco novo vazio aguardando acordes)
        if (!bars.length && !(entry.addedCells ?? 0)) return null
        return { block, entry, entryId: entry.id, entryKey: `${entry.id ?? i}`, bars, passIndex: 0 as const, baseEntryId: entry.id }
      })
      .filter(Boolean) as RawItem[]

    const patternMeta = buildPatternMeta(
      rawItems.map(({ block, bars }) => ({ block, bars }))
    )

    // ── Expandir com segunda passada para entradas com loopBackToEntryId ──────

    const allItems: RawItem[] = []
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i]
      allItems.push(item)

      const loopTargetId = item.entry.loopBackToEntryId
      if (!loopTargetId) continue
      const targetIdx = rawItems.findIndex(r => r.entryId === loopTargetId)
      if (targetIdx < 0 || targetIdx >= i) continue

      for (let j = targetIdx; j <= i; j++) {
        const orig = rawItems[j]
        allItems.push({
          block: orig.block,
          // segunda passada: espelha deletedRows do original, sem addedCells e sem loop aninhado
          entry: { ...orig.entry, loopBackToEntryId: undefined, addedCells: 0 },
          entryId: `${orig.entryId}-p2`,
          entryKey: `${orig.entryKey}-p2`,
          bars: orig.bars,
          passIndex: 1 as const,
          baseEntryId: orig.entryId,
        })
      }
    }

    // ── Step 2: filledBarIndex + effectiveTotal por entry ─────────────────────

    const filledBarIndex = new Map<string, number>()
    const effectiveTotalByEntry = new Map<string, number>()
    {
      let pos = 1
      for (const { entry, entryId, bars, passIndex, baseEntryId } of allItems) {
        const bpc = entry.barsPerCell ?? 1
        const cells = mergedBarsForSection(bars, bpc)
        const baseTotal = cells.length + (entry.addedCells ?? 0)
        // p2 espelha overrides/extras da 1ª passada
        const lookupPrefix = passIndex === 1 ? `${baseEntryId}:` : `${entryId}:`

        let effectiveTotal = baseTotal
        for (const key of Object.keys(chordOverrides)) {
          if (key.startsWith(lookupPrefix)) {
            const ci = parseInt(key.slice(lookupPrefix.length))
            if (Number.isFinite(ci) && ci >= baseTotal)
              effectiveTotal = Math.max(effectiveTotal, ci + 1)
          }
        }
        for (const key of Object.keys(extraChords)) {
          if (key.startsWith(lookupPrefix)) {
            const ci = parseInt(key.slice(lookupPrefix.length))
            if (Number.isFinite(ci) && ci >= baseTotal)
              effectiveTotal = Math.max(effectiveTotal, ci + 1)
          }
        }
        effectiveTotalByEntry.set(entryId, effectiveTotal)

        const deletedRowSet = new Set(entry.deletedRows ?? [])

        for (let rep = 0; rep < entry.repeatCount; rep++) {
          for (let ci = 0; ci < effectiveTotal; ci++) {
            const ownKey    = `${entryId}:${ci}`
            const lookupKey = passIndex === 1 ? `${baseEntryId}:${ci}` : ownKey
            const original  = ci < cells.length ? cells[ci].flat() : []
            const extras    = extraChords[lookupKey] ?? []
            const ov        = chordOverrides[lookupKey]
            const chords    = ov !== undefined ? ov : [...original, ...extras]
            const inDeletedRow = deletedRowSet.has(Math.floor(ci / BARS_PER_ROW))
            if (chords.length > 0 && !inDeletedRow) {
              if (rep === 0) filledBarIndex.set(ownKey, pos)
              pos++
            }
          }
        }
      }
    }

    // ── Montar sections ───────────────────────────────────────────────────────

    // Mapa entryId (primeira passada) → índice em rawItems para patternMeta
    const rawItemIdxById = new Map(rawItems.map((r, i) => [r.entryId, i]))

    // Pré-computar label final de cada rawItem para o mapa label→cor
    // Mesma letra = mesma cor, automaticamente
    const labelToColor = new Map<string, string>()
    rawItems.forEach(({ entry }, i) => {
      const meta = patternMeta[i]
      const label = entry.customLabel ?? meta.label
      if (!labelToColor.has(label)) labelToColor.set(label, meta.color)
    })

    let rawBarAcc = 0
    const sections: EngineSection[] = allItems.map(({ block, entry, entryId, entryKey, bars, passIndex, baseEntryId }) => {
      const bpc = entry.barsPerCell ?? 1
      const cells = mergedBarsForSection(bars, bpc)
      const sectionStartBar = rawBarAcc
      rawBarAcc += bars.length * entry.repeatCount
      const metaIdx = rawItemIdxById.get(baseEntryId) ?? 0
      const meta = patternMeta[metaIdx]
      // p1 can have a customLabel; p2 mirrors it from the original entry
      const origEntry = rawItems[metaIdx]?.entry
      const customLabel = passIndex === 0 ? entry.customLabel : origEntry?.customLabel
      const label = customLabel ?? meta.label
      return {
        block,
        entryId,
        entryKey,
        repeatCount: entry.repeatCount,
        barsPerCell: bpc,
        bars,
        cells,
        effectiveTotal: effectiveTotalByEntry.get(entryId) ?? cells.length,
        label,
        color: labelToColor.get(label) ?? meta.color,
        sectionStartBar,
        addedCells: entry.addedCells ?? 0,
        deletedRows: entry.deletedRows ?? [],
        hideEmptyBars: entry.hideEmptyBars ?? false,
        passIndex,
        baseEntryId,
        loopBackToEntryId: passIndex === 0 ? entry.loopBackToEntryId : undefined,
      }
    })

    // ── Step 3: sequence ──────────────────────────────────────────────────────

    let sectionBarAcc = 0
    const seqSections: SequenceSection[] = sections.map(s => {
      const lm = loopMarkers[s.baseEntryId] ?? null
      // Inclui células adicionadas: compara contra effectiveTotal * barsPerCell
      const loopEndCell =
        lm && lm.rawBarEnd < s.effectiveTotal * s.barsPerCell
          ? Math.floor(lm.rawBarEnd / s.barsPerCell)
          : undefined
      const sec: SequenceSection = {
        entryId: s.entryId,
        label: s.label,
        bars: s.bars,
        repeatCount: s.repeatCount,
        barsPerCell: s.barsPerCell,
        sectionStartBar: sectionBarAcc,
        totalCells: s.effectiveTotal,
        loopEndCell,
        loopCount: loopEndCell !== undefined ? lm!.count : undefined,
      }
      sectionBarAcc += s.bars.length * s.repeatCount
      return sec
    })

    const sequence = buildPulsadorSequence(seqSections, filledBarIndex)

    // ── Step 4: timings + devTimings + sectionFirstBars ──────────────────────

    const timings    = new Map<string, { startBar: number; endBar: number }[]>()
    const devTimings = new Map<string, { startBar: number; endBar: number }[]>()
    const sectionFirstBars = new Map<string, number>()
    for (let i = 0; i < sequence.length; i++) {
      const entry   = sequence[i]
      const entryId = entry.key.split(':')[0]
      if (!sectionFirstBars.has(entryId))
        sectionFirstBars.set(entryId, entry.startBar)
      const ranges = timings.get(entry.key) ?? []
      ranges.push({ startBar: entry.startBar, endBar: entry.endBar })
      timings.set(entry.key, ranges)
      // devTimings: chip i ocupa [i, i+1) — sem lacunas, alinhado com o ChipStrip
      const devRanges = devTimings.get(entry.key) ?? []
      devRanges.push({ startBar: i, endBar: i + 1 })
      devTimings.set(entry.key, devRanges)
    }

    // ── Step 5: repBoundaries ─────────────────────────────────────────────────

    const repBoundaries: number[] = []
    for (let i = 1; i < sequence.length; i++) {
      const prev = sequence[i - 1]
      const curr = sequence[i]
      const prevEId = prev.key.split(':')[0]
      const currEId = curr.key.split(':')[0]
      if (currEId === prevEId && curr.rep > prev.rep) {
        repBoundaries.push(curr.startBar)
      }
    }

    // ── Step 6: practiceLoops ─────────────────────────────────────────────────

    const practiceLoops: PracticeLoop[] = seqSections
      .filter(s => s.loopEndCell !== undefined && (s.loopCount ?? 0) > 1)
      .map(s => {
        const loopEndCell = s.loopEndCell!
        const cells = sequence
          .filter(e => {
            const ci = parseInt(e.key.split(':')[1])
            return e.key.startsWith(`${s.entryId}:`) && e.loopRep === 0 && e.rep === 0 && ci <= loopEndCell
          })
          .map(e => ({ key: e.key, startBar: e.startBar, endBar: e.endBar }))
        return { keys: cells.map(c => c.key), cells, loopCount: s.loopCount! }
      })
      .filter(p => p.cells.length > 0)

    return { effectiveArr, sections, filledBarIndex, sequence, timings, devTimings, sectionFirstBars, repBoundaries, practiceLoops }
  }, [blocks, arrangement, loopMarkers, chordOverrides, extraChords])
}
