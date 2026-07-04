import { Block, BlockType, ChordPosition, Line } from '@/app/_lib/types'
import { clampCapo, genId, makeLine, normalizeSectionType } from './shared'

// ── Parser de ChordPro ────────────────────────────────────────────────────────
// Formato onde o acorde fica embutido na letra entre colchetes, ex:
// "Que vêm de [Am]dentro do meu [F]coração", com metadados em diretivas
// entre chaves, ex: "{title: Anunciação}", "{key: Am}".
// Suporta o subconjunto de uso comum do padrão: título/artista/tom/capo/
// afinação, marcadores de início/fim de seção, e acorde inline. Diretivas
// avançadas (define, image, atalho de repetição {chorus}) não são tratadas
// de propósito — ficam sem efeito.

const DIRECTIVE_RE = /^\{\s*([a-z_]+)\s*(?::\s*(.*))?\}\s*$/i

const SECTION_START: Record<string, BlockType> = {
  start_of_chorus: 'chorus', soc: 'chorus',
  start_of_verse: 'verse', sov: 'verse',
  start_of_bridge: 'bridge', sob: 'bridge',
  start_of_tab: 'solo', sot: 'solo',
}

const SECTION_END = new Set([
  'end_of_chorus', 'eoc', 'end_of_verse', 'eov', 'end_of_bridge', 'eob', 'end_of_tab', 'eot',
])

/**
 * Detecta se um texto colado está em ChordPro: diretivas entre chaves
 * ("{title: ...}", "{soc}") OU um acorde entre colchetes colado dentro de
 * uma linha de letra (diferente de "[Seção]" isolada numa linha própria,
 * que é o marcador de seção do nosso outro formato de texto colado).
 */
export function looksLikeChordPro(text: string): boolean {
  if (DIRECTIVE_RE.test(text.split(/\r?\n/).find((l) => l.trim().startsWith('{')) ?? '')) return true
  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim()
    if (!trimmed.includes('[') || !trimmed.includes(']')) continue
    // "[Seção]" isolada, ou "[Seção] resto" (nosso formato de marcador com
    // acorde/dado solto na mesma linha, ex: "[Intro] Am F C G") — o colchete
    // de seção sempre é seguido de espaço ou nada; não é ChordPro.
    const leadingBracket = trimmed.match(/^\[[^\]]+\]/)
    if (leadingBracket) {
      const rest = trimmed.slice(leadingBracket[0].length)
      if (rest === '' || rest.startsWith(' ')) continue
    }
    if (/\[[^\]]+\]/.test(trimmed)) return true // colchete grudado no texto de letra
  }
  return false
}

function parseChordProLyricLine(line: string): Line {
  const chords: ChordPosition[] = []
  let out = ''
  let i = 0
  while (i < line.length) {
    if (line[i] === '[') {
      const close = line.indexOf(']', i + 1)
      if (close !== -1) {
        const value = line.slice(i + 1, close).trim()
        if (value) chords.push({ id: genId(), value, position: out.length })
        i = close + 1
        continue
      }
    }
    out += line[i]
    i++
  }
  return makeLine(out.trimEnd(), chords)
}

type BlockDraft = { name: string; type: BlockType; lines: Line[] }

// Um bloco só entra na cifra final se tiver conteúdo de fato — linhas em
// branco isoladas entre marcadores de seção (comuns em ChordPro pra separar
// estrofes) não devem virar blocos vazios no meio do arranjo.
function hasContent(draft: BlockDraft): boolean {
  return draft.lines.some((l) => l.text.trim() !== '' || l.chords.length > 0)
}

export function parseChordPro(raw: string): { title: string; artist: string; blocks: Block[] } {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let title = ''
  let artist = ''
  let songKey: string | undefined
  let capo: number | undefined
  let tuning: string | undefined

  const drafts: BlockDraft[] = []
  let cur: BlockDraft = { name: '', type: 'unknown', lines: [] }

  function startBlock(name: string, type: BlockType) {
    if (hasContent(cur)) drafts.push(cur)
    cur = { name, type, lines: [] }
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    const dm = trimmed.match(DIRECTIVE_RE)
    if (dm) {
      const key = dm[1].toLowerCase()
      const value = dm[2]?.trim()
      if (key === 'title' || key === 't') { if (value) title = value; continue }
      if (key === 'subtitle' || key === 'artist' || key === 'st') { if (value) artist = value; continue }
      if (key === 'key' || key === 'k') { songKey = value; continue }
      if (key === 'capo') { const n = value ? parseInt(value, 10) : NaN; if (Number.isFinite(n)) capo = clampCapo(n); continue }
      if (key === 'tuning') { tuning = value; continue }
      if (key === 'comment' || key === 'c') { cur.lines.push(makeLine(value ?? '')); continue }
      if (key in SECTION_START) {
        const type = SECTION_START[key]
        startBlock(value || defaultLabel(type), value ? normalizeSectionType(value) : type)
        continue
      }
      if (SECTION_END.has(key)) {
        if (hasContent(cur)) drafts.push(cur)
        cur = { name: '', type: 'unknown', lines: [] }
        continue
      }
      // Diretiva avançada não suportada (define/image/atalho de repetição etc.) — ignorada.
      continue
    }

    // Marcador de seção "[Nome]" isolado — fallback (ChordPro permite misturar).
    const bracketOnly = trimmed.match(/^\[([^\]]+)\]$/)
    if (bracketOnly) {
      startBlock(bracketOnly[1].trim(), normalizeSectionType(bracketOnly[1]))
      continue
    }

    cur.lines.push(parseChordProLyricLine(rawLine))
  }
  if (hasContent(cur)) drafts.push(cur)

  const headerLines: Line[] = [makeLine(title || 'Sem título')]
  if (artist) headerLines.push(makeLine(artist))
  const headerBlock: Block = {
    id: genId(), name: title || 'Sem título', type: 'header', order: 0,
    sections: [{ id: genId(), type: 'LYRICS_CHORDS', lines: headerLines }],
    songKey, capo, tuning,
  }

  const contentBlocks: Block[] = drafts.map((d, idx) => ({
    id: genId(),
    name: d.name || defaultLabel(d.type),
    type: d.type,
    order: idx + 1,
    sections: [{ id: genId(), type: 'LYRICS_CHORDS', lines: d.lines }],
  }))

  return { title: title || 'Sem título', artist, blocks: [headerBlock, ...contentBlocks] }
}

function defaultLabel(type: BlockType): string {
  switch (type) {
    case 'chorus': return 'Refrão'
    case 'verse': return 'Verso'
    case 'bridge': return 'Ponte'
    case 'solo': return 'Solo'
    case 'intro': return 'Intro'
    default: return 'Trecho'
  }
}
