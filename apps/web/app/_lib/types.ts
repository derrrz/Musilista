export type ChordPosition = {
  id: string
  value: string
  position: number // character column index
}

export type Line = {
  id: string
  text: string
  chords: ChordPosition[]
  continuation?: boolean  // true = linha criada por um break (segunda parte em diante)
}

export type BlockType = 'header' | 'intro' | 'verse' | 'chorus' | 'bridge' | 'solo' | 'unknown'

export type SectionType = 'LYRICS_CHORDS' | 'CHORDS_ONLY' | 'TAB'

type BaseSection = {
  id: string
  annotations?: string
}

export type LyricsSection = BaseSection & {
  type: 'LYRICS_CHORDS'
  lines: Line[]
}

export type ChordsOnlySection = BaseSection & {
  type: 'CHORDS_ONLY'
  lines: Line[]
}

export type TabSection = BaseSection & {
  type: 'TAB'
  lines: Line[]
  instrument?: 'guitar' | 'bass'
}

export type Section = LyricsSection | ChordsOnlySection | TabSection

export type Block = {
  id: string
  name: string
  type: BlockType
  sections: Section[]
  order: number
  color?: string         // cor customizada (hex) para blocos com nome livre
  songKey?: string       // tonalidade — somente no bloco header (ex: "Am", "C", "F#m")
  capo?: number          // capotaste: 1–12 (undefined = sem capo)
  tuning?: string        // afinação alterada (undefined = standard EADGBE)
}

export type ExtBar = { start: number; duration: number }

export type SyncData = {
  bpm: number
  beatsPerBar: number     // 4 for 4/4, 3 for 3/4, etc.
  beatValue?: number      // denominador: 4 para colcheia, 8 para semicolcheia (padrão 4)
  timeSigChanges?: Record<string, { num: number; den: number }> // chave: "${entryId}:${cellIndex}"
  offsetSeconds: number   // playback time when bar 0 starts
  extTrackId?: string
  extBars?: ExtBar[]
  extSections?: ExtBar[]
  extBarOffset?: number  // compassos externos a pular antes do compasso 0 da cifra (intros)
  extProgressMs?: number   // última posição conhecida (ms)
  extProgressAt?: number   // Date.now() quando progressMs foi gravado
  extIsPlaying?: boolean
  extDurationMs?: number   // duração total da faixa
  syncLatencyMs?: number       // compensação de latência visual: shift em ms aplicado ao currentMs
  forceSynced?: boolean        // dev mode: bypassa verificação isSynced no useSyncClock
}

/**
 * Entrada do arranjo: referencia um bloco com configurações visuais e de reprodução.
 *
 * CONTRATO DE ENDEREÇAMENTO DE COMPASSO
 * Acordes customizados (chordOverrides / extraChords) são indexados pela chave
 * composta `"${id}:${cellIndex}"` onde:
 *   - id        = ArrangementEntry.id (estável, nunca muda)
 *   - cellIndex = índice visual da célula APÓS aplicar barsPerCell
 *
 * INVARIANTE: ao mudar barsPerCell de N → M todos os overrides/extras do entry
 * devem ser remapeados atomicamente usando a fórmula:
 *   novo cellIndex = Math.floor(antigo_ci * N / M)
 * Isso é responsabilidade de changeBarsPerCell() — nunca do consumidor.
 */
export type ArrangementEntry = {
  id: string         // ID único desta entrada no arranjo
  blockId: string    // referência ao bloco
  repeatCount: number
  barsPerCell?: number  // quantos bars extraídos cabem em uma célula visual (default 1)
  addedCells?: number   // células extras adicionadas pelo usuário (além das do bloco original)
  deletedRows?: number[]  // índices de linhas originais ocultadas permanentemente pelo usuário
  hideEmptyBars?: boolean  // quando true, oculta compassos vazios no final do grupo
  /** Ao terminar este bloco, o pulsador volta para o entry indicado (loop não-consecutivo). */
  loopBackToEntryId?: string
  /** Identificador visual customizado (ex: "A", "B", "Intro"). Sobrescreve o gerado automaticamente. */
  customLabel?: string
  /** Quando true, oculta seções espelho (p2) e exibe dual-badge no cabeçalho para seek às duas passadas. */
  groupProgressions?: boolean
  /** Nome de exibição alternativo para a 2ª passada (② no dual-badge). Sem valor usa block.name. */
  mirrorName?: string
}

/**
 * Loop de prática: repetição das primeiras N células de uma seção do arranjo.
 *
 * rawBarEnd é o índice raw (antes de barsPerCell).
 * Para obter o cellIndex equivalente: Math.floor(rawBarEnd / barsPerCell).
 * Essa conversão deve ocorrer em um único lugar (useSequenceEngine) e nunca
 * ser replicada manualmente em componentes consumidores.
 */
export type LoopMarker = {
  rawBarEnd: number  // último bar (raw, antes de barsPerCell) da região de loop (inclusive)
  count: number      // quantas vezes repetir a região (inclui a primeira passagem)
}

export type EditorTab = {
  id: string
  name: string
  blocks: Block[]
  syncData?: SyncData
  arrangement?: ArrangementEntry[]  // undefined = auto (blocos em order); definido = arranjo manual
  sourceUrl?: string      // URL de origem (Cifra Club)
  dbSongId?: string       // UUID na tabela songs após primeiro save
  defaultView?: 'editor' | 'chart'  // view inicial ao abrir a aba
  readOnly?: boolean                 // true = cifra publicada aberta em modo leitura
  // Acordes adicionados pelo usuário por compasso na visão "Resumo Cifras".
  // Chave: "${entryId}:${cellIndex}" — ver invariante em ArrangementEntry.
  extraChords?: Record<string, string[]>
  // Override por compasso na visão "Resumo Cifras".
  // Chave: "${entryId}:${cellIndex}" — ver invariante em ArrangementEntry.
  // Quando definido, substitui completamente a lista de acordes exibida.
  chordOverrides?: Record<string, string[]>
  // Loop markers por entryId — persistidos junto com o tab.
  loopMarkers?: Record<string, LoopMarker>
}

// Compasso com ao menos 1 acorde, na ordem em que aparece no arranjo do tab ativo.
export type FilledBar = {
  key: string       // "${entryId}:${cellIndex}"
  entryId: string
  cellIndex: number
  chords: string[]  // lista efetiva de acordes (override > original + extras)
}

export type CustomBlockType = {
  name: string
  color: string
}

export type ChordSelectorState = {
  tabId: string
  blockId: string
  sectionId: string
  lineId: string
  position: number
  existingChordId?: string
  anchorX: number   // clientX do clique (para alinhar horizontalmente)
  lineTop: number   // topo da camada de acordes (início da linha)
  lineBottom: number // base do input de texto (fim da linha)
} | null
