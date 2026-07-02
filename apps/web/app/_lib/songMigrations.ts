// Pipeline de migrações versionadas para conteúdo de músicas.
//
// WORKFLOW PARA DESENVOLVEDORES:
// Se você mudar tipos em types.ts de forma breaking (novo campo obrigatório,
// renomeação, mudança de estrutura), faça:
//   1. Incrementar CURRENT_VERSION
//   2. Adicionar { from: N, to: N+1, description: '...', up: fn } em MIGRATIONS
//   3. Commit junto com a mudança nos tipos
//
// A migration é aplicada automaticamente em todo load e no batch admin.

import type { ArrangementEntry, Block } from './types'
import { detectArrangement } from './arrangement'

// ─── Versões conhecidas ───────────────────────────────────────────────────────

// v0 — formato legado: JSON era um array puro de Block[]
// v1 — objeto { blocks, syncMeta?, arrangement?, ... } sem campo `v`
// v2 — igual v1 + campo `v: 2` + defaults dos opcionais normalizados
// v3 — arranjo reconstruído a partir dos blocos (remove refs órfãs, zera deletedRows bugados)
export const CURRENT_VERSION = 3

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export type IssueCode =
  | 'v0_legacy_array'        // formato antigo: JSON era array de blocos
  | 'v1_unwrapped'           // objeto sem campo v explícito
  | 'missing_syncmeta'       // nenhum syncMeta armazenado
  | 'missing_beatValue'      // beatValue ausente em syncMeta
  | 'missing_syncLatencyMs'  // syncLatencyMs ausente em syncMeta
  | 'missing_barsPerCell'    // algum ArrangementEntry sem barsPerCell
  | 'missing_addedCells'     // algum ArrangementEntry sem addedCells
  | 'missing_deletedRows'    // algum ArrangementEntry sem deletedRows
  | 'stale_arrangement'      // arranjo com refs órfãs ou deletedRows suspeitos (v2→v3)
  | 'malformed_blocks'       // blocks não é um array — não auto-corrigível
  | 'malformed_sections'     // section com type desconhecido — não auto-corrigível
  | 'parse_error'            // JSON inválido — não auto-corrigível

export type Issue = {
  code: IssueCode
  detail?: string
  autoFixed: boolean  // true = migration corrigiu; false = requer atenção manual
}

// Conteúdo normalizado retornado pelo pipeline — equivale ao formato stored v3
export type NormalizedContent = {
  v: number
  blocks: unknown[]
  syncMeta: NormalizedSyncMeta | null
  arrangement: ArrangementEntry[] | null
  chordOverrides: Record<string, string[]> | null
  extraChords: Record<string, string[]> | null
  loopMarkers: Record<string, { rawBarEnd: number; count: number }> | null
}

export type NormalizedSyncMeta = {
  bpm: number
  beatsPerBar: number
  offsetSeconds: number
  beatValue: number
  syncLatencyMs: number
  forceSynced: boolean
  [key: string]: unknown  // preserva campos extras (spotifyTrackId, etc.)
}

export type MigrationResult = {
  content: NormalizedContent
  originalVersion: number
  appliedMigrations: string[]
  issues: Issue[]
  wasModified: boolean  // true se qualquer migration foi aplicada
}

// ─── Funções internas ─────────────────────────────────────────────────────────

function detectVersion(parsed: unknown): number {
  if (Array.isArray(parsed)) return 0
  if (parsed !== null && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (typeof obj.v === 'number') return obj.v
    if (Array.isArray(obj.blocks)) return 1
  }
  return 0
}

function normalizeSyncMeta(sm: unknown): NormalizedSyncMeta {
  if (!sm || typeof sm !== 'object') {
    return { bpm: 120, beatsPerBar: 4, offsetSeconds: 0, beatValue: 4, syncLatencyMs: 0, forceSynced: false }
  }
  const s = sm as Record<string, unknown>
  return {
    ...s,
    bpm:           typeof s.bpm === 'number'           ? s.bpm           : 120,
    beatsPerBar:   typeof s.beatsPerBar === 'number'   ? s.beatsPerBar   : 4,
    offsetSeconds: typeof s.offsetSeconds === 'number' ? s.offsetSeconds : 0,
    beatValue:     typeof s.beatValue === 'number'     ? s.beatValue     : 4,
    syncLatencyMs: typeof s.syncLatencyMs === 'number' ? s.syncLatencyMs : 0,
    forceSynced:   typeof s.forceSynced === 'boolean'  ? s.forceSynced   : false,
    // timeSigChanges: não injetado como {} — ausência tem semântica diferente de vazio
  }
}

function normalizeEntry(e: unknown): ArrangementEntry {
  if (!e || typeof e !== 'object') return e as ArrangementEntry
  const entry = e as Record<string, unknown>
  return {
    ...(entry as ArrangementEntry),
    barsPerCell: typeof entry.barsPerCell === 'number' ? entry.barsPerCell : 1,
    addedCells:  typeof entry.addedCells  === 'number' ? entry.addedCells  : 0,
    deletedRows: Array.isArray(entry.deletedRows)      ? entry.deletedRows : [],
  }
}

/**
 * Reconstrói o arranjo a partir do "desenho teórico da música" (blocos).
 *
 * Para cada bloco com acordes (na ordem do bloco), verifica se já existe uma
 * entrada no arranjo antigo com o mesmo blockId:
 *   - Se existir: preserva o ID antigo (mantém chaves de chordOverrides/extraChords)
 *     e preserva customizações do usuário (repeatCount, barsPerCell, etc.).
 *     Zera `deletedRows` — era o campo preenchido incorretamente pelo bug antigo.
 *   - Se não existir: adiciona entrada nova com IDs gerados pelo detectArrangement.
 *
 * Entradas do arranjo antigo que apontam para blocos inexistentes são removidas
 * silenciosamente (refs órfãs).
 */
function rebuildArrangementFromBlocks(
  blocks: unknown[],
  oldArrangement: ArrangementEntry[] | null,
): ArrangementEntry[] {
  const typedBlocks = blocks as Block[]
  const theoretical = detectArrangement(typedBlocks)

  if (!oldArrangement?.length) return theoretical

  // Mapeia blockId → entrada antiga (para preservar customizações)
  const oldByBlockId = new Map(oldArrangement.map(e => [e.blockId, e]))

  return theoretical.map(theoryEntry => {
    const old = oldByBlockId.get(theoryEntry.blockId)
    if (!old) return theoryEntry  // bloco novo, sem histórico — usa entrada limpa

    // Preserva ID antigo → chordOverrides/extraChords continuam válidos
    // Preserva customizações do usuário, mas zera deletedRows (bug antigo)
    const rebuilt: ArrangementEntry = {
      id:          old.id,
      blockId:     theoryEntry.blockId,
      repeatCount: typeof old.repeatCount === 'number' ? old.repeatCount : 1,
      barsPerCell: typeof old.barsPerCell === 'number' ? old.barsPerCell : 1,
      addedCells:  typeof old.addedCells  === 'number' ? old.addedCells  : 0,
      deletedRows: [],  // reset: campo preenchido incorretamente pelo componente antigo
      hideEmptyBars: old.hideEmptyBars ?? false,
    }
    if (old.loopBackToEntryId) rebuilt.loopBackToEntryId = old.loopBackToEntryId
    if (old.customLabel)       rebuilt.customLabel       = old.customLabel
    if (old.groupProgressions) rebuilt.groupProgressions = old.groupProgressions
    if (old.mirrorName)        rebuilt.mirrorName        = old.mirrorName
    return rebuilt
  })
}

// ─── Registry de migrations ───────────────────────────────────────────────────

type Migration = {
  from: number
  to: number
  description: string
  up: (content: unknown) => unknown
}

const MIGRATIONS: Migration[] = [
  {
    from: 0,
    to: 1,
    description: 'Wrap legacy block array into structured object',
    up: (arr) => ({ blocks: arr }),
  },
  {
    from: 1,
    to: 2,
    description: 'Add schema version field and normalize optional fields (syncMeta, ArrangementEntry)',
    up: (c: unknown) => {
      const obj = c as Record<string, unknown>
      return {
        ...obj,
        v:           2,
        syncMeta:    normalizeSyncMeta(obj.syncMeta),
        arrangement: Array.isArray(obj.arrangement) ? obj.arrangement.map(normalizeEntry) : null,
      }
    },
  },
  {
    from: 2,
    to: 3,
    description: 'Rebuild arrangement from blocks (removes orphan refs, resets corrupted deletedRows)',
    up: (c: unknown) => {
      const obj = c as Record<string, unknown>
      const blocks       = Array.isArray(obj.blocks) ? obj.blocks : []
      const oldArr       = Array.isArray(obj.arrangement) ? obj.arrangement as ArrangementEntry[] : null
      const newArr       = blocks.length > 0 ? rebuildArrangementFromBlocks(blocks, oldArr) : oldArr
      return { ...obj, v: 3, arrangement: newArr }
    },
  },
  // ─── Próximas migrations ────────────────────────────────────────────────────
  // { from: 3, to: 4, description: '...', up: (c) => ({ ...c, v: 4, ... }) },
]

// ─── Análise de issues ────────────────────────────────────────────────────────

function analyzeIssues(originalVersion: number, content: NormalizedContent): Issue[] {
  const issues: Issue[] = []

  if (originalVersion === 0) {
    issues.push({ code: 'v0_legacy_array', autoFixed: true })
  }
  if (originalVersion === 1) {
    issues.push({ code: 'v1_unwrapped', autoFixed: true })
  }
  if (originalVersion === 2) {
    // v2 → v3: reconstrução do arranjo
    issues.push({ code: 'stale_arrangement', autoFixed: true })
  }

  const sm = content.syncMeta
  if (!sm) {
    issues.push({ code: 'missing_syncmeta', autoFixed: true })
  } else {
    if (typeof (sm as Record<string, unknown>).beatValue !== 'number') {
      issues.push({ code: 'missing_beatValue', autoFixed: true })
    }
    if (typeof (sm as Record<string, unknown>).syncLatencyMs !== 'number') {
      issues.push({ code: 'missing_syncLatencyMs', autoFixed: true })
    }
  }

  if (content.arrangement) {
    let missingBarsPerCell = false
    let missingAddedCells  = false
    let missingDeletedRows = false
    for (const entry of content.arrangement) {
      const e = entry as Record<string, unknown>
      if (e.barsPerCell  === undefined) missingBarsPerCell = true
      if (e.addedCells   === undefined) missingAddedCells  = true
      if (e.deletedRows  === undefined) missingDeletedRows = true
    }
    if (missingBarsPerCell) issues.push({ code: 'missing_barsPerCell', autoFixed: true })
    if (missingAddedCells)  issues.push({ code: 'missing_addedCells',  autoFixed: true })
    if (missingDeletedRows) issues.push({ code: 'missing_deletedRows', autoFixed: true })
  }

  if (!Array.isArray(content.blocks)) {
    issues.push({ code: 'malformed_blocks', autoFixed: false })
  }

  return issues
}

// ─── Função principal ─────────────────────────────────────────────────────────

export function runMigrations(raw: string): MigrationResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    const parseIssue: Issue = { code: 'parse_error', detail: String(e), autoFixed: false }
    throw Object.assign(new Error('parse_error'), { issues: [parseIssue] })
  }

  const originalVersion  = detectVersion(parsed)
  const appliedMigrations: string[] = []
  let current = parsed
  let version = originalVersion

  for (const migration of MIGRATIONS) {
    if (version >= CURRENT_VERSION) break
    if (version === migration.from) {
      current = migration.up(current)
      appliedMigrations.push(migration.description)
      version = migration.to
    }
  }

  const content = current as NormalizedContent
  const issues  = analyzeIssues(originalVersion, content)

  return {
    content,
    originalVersion,
    appliedMigrations,
    issues,
    wasModified: appliedMigrations.length > 0,
  }
}

// Serializa o conteúdo normalizado de volta para string (para persistência).
export function serializeContent(content: NormalizedContent): string {
  // Remove campos null para economizar espaço
  const out: Record<string, unknown> = { v: content.v, blocks: content.blocks }
  if (content.syncMeta)       out.syncMeta       = content.syncMeta
  if (content.arrangement)    out.arrangement    = content.arrangement
  if (content.chordOverrides) out.chordOverrides = content.chordOverrides
  if (content.extraChords)    out.extraChords    = content.extraChords
  if (content.loopMarkers)    out.loopMarkers    = content.loopMarkers
  return JSON.stringify(out)
}
