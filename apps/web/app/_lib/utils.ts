import { Block, BlockType, Line, Section, SectionType } from './types'

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

// Detecta o tipo de bloco a partir do texto da primeira linha não-vazia.
// Retorna null se não reconhecer nenhum padrão.
const TYPE_PATTERNS: { pattern: RegExp; type: BlockType; label: string }[] = [
  { pattern: /^(intro|introdução|introdução)\b/i,                      type: 'intro',   label: 'Introdução' },
  { pattern: /^(verso|verse)\b/i,                                       type: 'verse',   label: 'Verso'      },
  { pattern: /^(refrão|refrao|coro|chorus)\b/i,                        type: 'chorus',  label: 'Refrão'     },
  { pattern: /^(pré-?refrão|pre-?refrão|pre-?chorus|pré-?chorus)\b/i,  type: 'bridge',  label: 'Ponte'      },
  { pattern: /^(ponte|bridge)\b/i,                                      type: 'bridge',  label: 'Ponte'      },
  { pattern: /^(solo|riff|interlúdio|interlude|instrumental)\b/i,       type: 'solo',    label: 'Solo'       },
  { pattern: /^(final|outro|coda|encerramento)\b/i,                     type: 'unknown', label: 'Final'      },
]

function detectBlockType(firstLine: string): { type: BlockType; name: string } | null {
  const trimmed = firstLine.trim()
  if (!trimmed || trimmed.length > 40) return null
  for (const { pattern, type, label } of TYPE_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Usa o texto original como nome (ex: "Verso 1"), mas normaliza apenas o rótulo base
      const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
      return { type, name: normalized || label }
    }
  }
  return null
}

export function createSection(
  type: SectionType,
  lines: Line[] = [],
  instrument?: 'guitar' | 'bass'
): Section {
  if (type === 'TAB') {
    return { id: generateId(), type: 'TAB', lines, instrument }
  }
  if (type === 'CHORDS_ONLY') {
    return { id: generateId(), type: 'CHORDS_ONLY', lines }
  }
  return { id: generateId(), type: 'LYRICS_CHORDS', lines }
}

export function parseTextToBlocks(text: string): Block[] {
  const blockTexts = text.split(/\n[ \t]*\n/).filter(b => b.trim().length > 0)

  const firstNonEmpty = blockTexts[0]?.split('\n').filter(l => l.trim().length > 0) ?? []
  const firstIsHeader = firstNonEmpty.length === 2

  return blockTexts.map((blockText, index) => {
    const lines: Line[] = blockText.split('\n').map(lineText => ({
      id: generateId(),
      text: lineText,
      chords: [],
    }))

    const isHeader = index === 0 && firstIsHeader
    const contentNumber = firstIsHeader ? index : index + 1

    if (isHeader) {
      return {
        id: generateId(),
        name: 'Cabeçalho',
        type: 'header' as BlockType,
        sections: [createSection('LYRICS_CHORDS', lines)],
        order: index,
      }
    }

    // Tenta detectar o tipo pelo texto da primeira linha não-vazia
    const firstNonempty = lines.find(l => l.text.trim().length > 0)
    const detected = firstNonempty ? detectBlockType(firstNonempty.text) : null

    return {
      id: generateId(),
      name: detected ? detected.name : `Bloco ${contentNumber}`,
      type: detected ? detected.type : ('unknown' as BlockType),
      sections: [createSection('LYRICS_CHORDS', lines)],
      order: index,
    }
  })
}

/** Migra blocos no formato antigo (linesMap + contentType) para o novo formato (sections[]).
 *  Chamada no EditorProvider ao hidratar o estado do localStorage. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateBlock(old: any): Block {
  if (old.sections) return old as Block
  const sections: Section[] = []
  if (old.linesMap?.LYRICS_CHORDS?.length)
    sections.push(createSection('LYRICS_CHORDS', old.linesMap.LYRICS_CHORDS))
  if (old.linesMap?.CHORDS?.length)
    sections.push(createSection('CHORDS_ONLY', old.linesMap.CHORDS))
  if (old.linesMap?.TAB?.length)
    sections.push(createSection('TAB', old.linesMap.TAB, old.tabInstrument))
  if (sections.length === 0)
    sections.push(createSection('LYRICS_CHORDS', []))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contentType: _ct, linesMap: _lm, tabInstrument: _ti, annotations: _an, ...rest } = old
  return { ...rest, sections } as Block
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  header: 'Cabeçalho',
  intro: 'Introdução',
  verse: 'Verso',
  chorus: 'Refrão',
  bridge: 'Ponte',
  solo: 'Solo',
  unknown: 'Outro',
}

// ─── Teoria musical — campo harmônico ────────────────────────────────────────

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const ENHARMONIC: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#',
}

// Intervalos (semitons) e qualidades dos 7 graus
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10]
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim']
const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', '']

function normalizeNote(note: string): string {
  return ENHARMONIC[note] ?? note
}

/** Retorna os 7 acordes diatônicos da tonalidade como `{root, quality}` */
export function getCampoHarmonico(key: string): Array<{ root: string; quality: string }> {
  const isMinor = key.endsWith('m')
  const rawRoot = isMinor ? key.slice(0, -1) : key
  const root = normalizeNote(rawRoot)
  const rootIdx = CHROMATIC.indexOf(root)
  if (rootIdx === -1) return []
  const intervals = isMinor ? MINOR_INTERVALS : MAJOR_INTERVALS
  const qualities = isMinor ? MINOR_QUALITIES : MAJOR_QUALITIES
  return intervals.map((interval, i) => ({
    root: CHROMATIC[(rootIdx + interval) % 12],
    quality: qualities[i],
  }))
}

/** Verifica se um acorde pertence ao campo harmônico da tonalidade.
 *  Ignora extensões (7, 9, sus, add, maj7) — compara apenas raiz + maior/menor/dim. */
export function isChordInKey(chordValue: string, key: string): boolean {
  const match = chordValue.match(/^([A-G][#b]?)(.*)$/)
  if (!match) return true   // não reconhecido → não sinalizar
  const root = normalizeNote(match[1])
  const rest = match[2]
  // Power chord (5) não tem terça → ambíguo, nunca sinalizar como fora do campo
  if (/^5/.test(rest)) return true
  const isDim     = /^(dim|°)/.test(rest)
  const isMinorCh = !isDim && /^m(?!aj)/.test(rest)
  const quality   = isDim ? 'dim' : isMinorCh ? 'm' : ''
  return getCampoHarmonico(key).some(c => c.root === root && c.quality === quality)
}

export function buildChordValue(
  note: string,
  accidental: string,
  quality: string
): string {
  return `${note}${accidental}${quality}`
}

export function measureCharWidth(element: HTMLElement): number {
  const span = document.createElement('span')
  span.style.cssText = `
    position: absolute;
    visibility: hidden;
    font-family: ${window.getComputedStyle(element).fontFamily};
    font-size: ${window.getComputedStyle(element).fontSize};
    white-space: pre;
  `
  span.textContent = '0'.repeat(20)
  document.body.appendChild(span)
  const width = span.getBoundingClientRect().width / 20
  document.body.removeChild(span)
  return width
}

export function shiftChordsOnInsert(
  chords: { id: string; value: string; position: number }[],
  insertAt: number,
  insertCount: number
) {
  return chords.map(c =>
    c.position >= insertAt
      ? { ...c, position: c.position + insertCount }
      : c
  )
}

export function shiftChordsOnDelete(
  chords: { id: string; value: string; position: number }[],
  deleteAt: number,
  deleteCount: number
) {
  return chords
    .map(c => {
      if (c.position >= deleteAt + deleteCount) {
        return { ...c, position: c.position - deleteCount }
      }
      if (c.position >= deleteAt) {
        return null // chord was in the deleted range
      }
      return c
    })
    .filter(Boolean) as { id: string; value: string; position: number }[]
}
