import { Block, BlockType, Line, Section } from '@/app/_lib/types'
import { genId, isPlainChordToken, makeLine, normalizeSectionType } from './shared'
import type { ParsedSong } from './cifraClubHtml'

// ─── Parser de texto plano (formato "acordes acima das letras") ──────────────
// Usado pelo Bananacifras e outros sites que entregam texto em vez de HTML

function isPlainChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  return tokens.length > 0 && tokens.every(isPlainChordToken)
}

const SECTION_RE = /^(intro|verso|pré-refrão|pre-refrao|pre-refrão|refrão|refrao|coro|ponte|solo|final|interludio|interlúdio|outro|bridge|chorus|verse|pre-chorus)\b/i
const SECTION_NAMES: Record<string, string> = {
  intro: 'Intro', verso: 'Verso', 'pré-refrão': 'Pré-Refrão', 'pre-refrao': 'Pré-Refrão', 'pre-refrão': 'Pré-Refrão',
  refrão: 'Refrão', refrao: 'Refrão', coro: 'Refrão', ponte: 'Ponte', solo: 'Solo',
  final: 'Final', interludio: 'Interlúdio', interlúdio: 'Interlúdio', outro: 'Final',
  bridge: 'Ponte', chorus: 'Refrão', verse: 'Verso', 'pre-chorus': 'Pré-Refrão',
}

export function parsePlainTextChords(
  content: string,
  trackName: string,
  artistName: string,
  tone?: string,
  capo?: string,
): ParsedSong {
  const rawLines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let currentBlockName = ''
  let currentLines: Line[] = []
  let pendingChords: { value: string; col: number }[] = []
  const capoNum = capo ? parseInt(capo) : undefined

  function flush() {
    if (pendingChords.length > 0) {
      currentLines.push(makeLine('', pendingChords.map(c => ({ id: genId(), value: c.value, position: c.col }))))
      pendingChords = []
    }
    if (currentLines.length === 0) return
    const blockType = normalizeSectionType(currentBlockName)
    blocks.push({ id: genId(), name: currentBlockName, type: blockType, order: blocks.length,
      sections: [{ id: genId(), type: 'LYRICS_CHORDS', lines: currentLines } as Section] })
    currentLines = []
    currentBlockName = ''
  }

  // Header block
  blocks.push({ id: genId(), name: '', type: 'header', order: 0,
    sections: [{ id: genId(), type: 'LYRICS_CHORDS', lines: [makeLine(trackName), makeLine(artistName)] } as Section],
    ...(tone ? { songKey: tone } : {}), ...(capoNum && capoNum > 0 ? { capo: capoNum } : {}) })

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    const trimmed = raw.trim()
    if (!trimmed) { flush(); continue }

    // Section header detection
    const colonMatch = trimmed.match(/^([^:]{1,20}):\s*/)
    if (colonMatch) {
      const key = colonMatch[1].trim().toLowerCase()
      if (SECTION_NAMES[key] || SECTION_RE.test(trimmed)) {
        flush()
        currentBlockName = SECTION_NAMES[key] ?? colonMatch[1].trim()
        continue
      }
    }

    if (isPlainChordLine(raw)) {
      const nextLine = rawLines[i + 1] ?? ''
      const tokens = raw.trim().split(/\s+/)
      const chordWithCols = tokens.reduce<{ value: string; col: number }[]>((acc, token) => {
        const start = acc.length > 0 ? acc[acc.length-1].col + acc[acc.length-1].value.length : 0
        return [...acc, { value: token, col: raw.indexOf(token, start) }]
      }, [])

      if (nextLine.trim() && !isPlainChordLine(nextLine)) {
        // Chord line above a lyric line — defer chords to next iteration
        if (pendingChords.length > 0) {
          currentLines.push(makeLine('', pendingChords.map(c => ({ id: genId(), value: c.value, position: c.col }))))
        }
        pendingChords = chordWithCols
      } else {
        // Standalone chord line
        if (pendingChords.length > 0) {
          currentLines.push(makeLine('', pendingChords.map(c => ({ id: genId(), value: c.value, position: c.col }))))
          pendingChords = []
        }
        currentLines.push(makeLine('', chordWithCols.map(c => ({ id: genId(), value: c.value, position: c.col }))))
      }
      continue
    }

    // Lyric line
    currentLines.push(makeLine(trimmed, pendingChords.map(c => ({ id: genId(), value: c.value, position: c.col }))))
    pendingChords = []
  }
  flush()

  return {
    title: trackName, artist: artistName, songKey: tone ?? '',
    blocks: blocks.filter(b => b.sections[0].lines.length > 0 || b.type === 'header'),
    arrangement: [],
  }
}
