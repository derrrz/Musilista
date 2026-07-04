import { Block, BlockType, Line, ChordPosition, Section } from '@/app/_lib/types'
import {
  decodeEntities,
  extractRepeatCount,
  genId,
  makeLine,
  normalizeSectionType,
  parseTuningRaw,
  stripTags,
  TAB_STRING_RE,
} from './shared'

// ─── Chord line parser (HTML — acordes em <b>) ───────────────────────────────

function parseChordLine(htmlLine: string): ChordPosition[] {
  const chords: ChordPosition[] = []
  let pos = 0
  let i = 0

  while (i < htmlLine.length) {
    if (/^<b>/i.test(htmlLine.slice(i))) {
      const closeIdx = htmlLine.toLowerCase().indexOf('</b>', i + 3)
      if (closeIdx !== -1) {
        const inner = decodeEntities(stripTags(htmlLine.slice(i + 3, closeIdx))).trim()
        if (inner) chords.push({ id: genId(), value: inner, position: pos })
        pos += inner.length
        i = closeIdx + 4
        continue
      }
    }
    if (htmlLine[i] === '<') {
      const end = htmlLine.indexOf('>', i)
      if (end !== -1) { i = end + 1; continue }
    }
    // Acorde em texto plano dentro de parênteses: (A5), (Bm7), (F#), etc.
    // Só captura quando NÃO há <b> dentro — se há, o handler de <b> já cuida.
    if (htmlLine[i] === '(') {
      const closeIdx = htmlLine.indexOf(')', i + 1)
      if (closeIdx !== -1) {
        const inside = htmlLine.slice(i + 1, closeIdx)
        if (!/<b>/i.test(inside)) {
          const inner = decodeEntities(stripTags(inside)).trim()
          if (/^[A-G][#b]?/.test(inner) && inner.length > 0 && inner.length <= 10) {
            chords.push({ id: genId(), value: inner, position: pos })
            pos += 1 + inner.length + 1   // '(' + valor + ')'
            i = closeIdx + 1
            continue
          }
        }
      }
    }
    const entity = htmlLine.slice(i).match(/^&[a-z#\d]+;/)
    if (entity) { pos++; i += entity[0].length; continue }
    pos++
    i++
  }

  return chords
}

function isChordLine(htmlLine: string): boolean {
  if (!/<b>/i.test(htmlLine)) return false
  const outside = htmlLine
    .replace(/<b>[^<]*<\/b>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#\d]+;/gi, ' ')
    .replace(/\([^)]*\)/g, '')   // parênteses em volta de acordes opcionais ex: (A5)
  return /^\s*$/.test(outside)
}

// ─── TAB parser ───────────────────────────────────────────────────────────────

// Effect characters that can follow a fret number in ASCII tab notation:
//   h  = hammer-on       p  = pull-off
//   /  = slide up        \  = slide down
//   b  = bend            r  = release bend
//   ~  = vibrato
const POST_EFFECT_RE = /^[hpb\/\\~r]/

/**
 * Tab notation cell encoding (stored as CSV in Line.text):
 *   "-"    → no note (rest)
 *   "x"    → dead / muted note
 *   "5"    → fret 5
 *   "5h"   → fret 5 + hammer-on to next note
 *   "5p"   → fret 5 + pull-off to next note
 *   "5/"   → fret 5 + slide up
 *   "5\"   → fret 5 + slide down
 *   "5b"   → fret 5 + bend
 *   "5r"   → fret 5 + release bend
 *   "5~"   → fret 5 + vibrato
 *   "t5"   → tap at fret 5
 *   "<12>" → natural harmonic at fret 12
 */

/**
 * Parses ASCII tab string lines into columns.
 * Returns { columns, positions } where positions[i] is the character offset
 * of column i in the original first string line (used for chord-label alignment).
 *
 * Aceita a partir de 1 linha de corda — um trecho parcial (ex: dedilhado de
 * 2 cordas) ainda é útil e a inferência de instrumento já degrada bem para
 * qualquer contagem.
 */
function parseTabColumns(stringLines: string[]): { columns: Line[]; positions: number[] } {
  const numStrings = stringLines.length
  if (numStrings < 1) return { columns: [], positions: [] }

  const firstLine = stringLines[0]
  const prefixLen = (firstLine.indexOf('|') + 1) || 2

  const contents = stringLines.map(l => {
    const pipe = l.indexOf('|')
    return pipe !== -1 ? l.slice(pipe + 1) : l
  })

  const maxLen = Math.max(...contents.map(c => c.length))
  const columns: Line[] = []
  const positions: number[] = []

  let i = 0
  while (i < maxLen) {
    const cellVals: (string | null)[] = new Array(numStrings).fill(null)
    let hasNote = false
    let advanceBy = 1   // minimum advance

    for (let s = 0; s < numStrings; s++) {
      const ch0 = contents[s]?.[i] ?? ''

      // ── Harmonic: <12> ──────────────────────────────────────────────────────
      if (ch0 === '<') {
        const closeIdx = contents[s].indexOf('>', i + 1)
        if (closeIdx !== -1) {
          const inner = contents[s].slice(i + 1, closeIdx)
          if (/^\d{1,2}$/.test(inner)) {
            hasNote = true
            cellVals[s] = `<${inner}>`
            advanceBy = Math.max(advanceBy, closeIdx - i + 1)
          }
        }
        continue
      }

      // ── Tap prefix: t/T ─────────────────────────────────────────────────────
      let offset = 0
      const hasTap = ch0 === 't' || ch0 === 'T'
      if (hasTap) offset = 1

      const ch = contents[s]?.[i + offset] ?? ''

      // ── Dead / muted note: x ────────────────────────────────────────────────
      if (ch === 'x' || ch === 'X') {
        hasNote = true
        cellVals[s] = 'x'
        advanceBy = Math.max(advanceBy, offset + 1)
        continue
      }

      // ── Numeric fret ────────────────────────────────────────────────────────
      if (/\d/.test(ch)) {
        hasNote = true
        const ch2 = contents[s]?.[i + offset + 1] ?? ''
        const twoDigit = /\d/.test(ch2)
        const fretStr = twoDigit ? ch + ch2 : ch
        const fretWidth = twoDigit ? 2 : 1

        // Capture effect char (does NOT count toward advance — naturally skipped)
        const effCh = contents[s]?.[i + offset + fretWidth] ?? ''
        const effect = POST_EFFECT_RE.test(effCh) ? effCh : ''

        cellVals[s] = `${hasTap ? 't' : ''}${fretStr}${effect}`
        // Advance covers tap prefix + fret digits (effect char at next pos is auto-skipped)
        advanceBy = Math.max(advanceBy, offset + fretWidth)
      }
    }

    if (hasNote) {
      columns.push({ id: genId(), text: cellVals.map(v => v ?? '-').join(','), chords: [] })
      positions.push(prefixLen + i)
    }
    i += advanceBy
  }

  return { columns, positions }
}

/**
 * Maps chord labels onto tab columns.
 *
 * Strategy — tries position-based alignment first:
 *   For each chord at character-position P, find the tab column whose character position
 *   is closest to P.  If the average alignment error across all chords is ≤ MAX_DIST,
 *   use that mapping.  Otherwise fall back to even distribution.
 *
 * This handles both:
 *   • Precisely-aligned single-part tabs  (position alignment is accurate)
 *   • Section-level / multi-part tab labels (falls back to even distribution)
 */
function mapChordsToColumns(
  chords: ChordPosition[],
  columns: Line[],
  firstPartPositions: number[]
): Line[] {
  if (chords.length === 0 || columns.length === 0) return columns

  const result = columns.map(col => ({ ...col }))

  const MAX_DIST = 6  // chars; below this → position-aligned

  // Build assignment: chordIndex → columnIndex
  const assignment = new Array<number>(chords.length).fill(-1)

  if (firstPartPositions.length > 0) {
    let totalDist = 0
    for (let ci = 0; ci < chords.length; ci++) {
      let best = 0
      let bestD = Math.abs(firstPartPositions[0] - chords[ci].position)
      for (let pi = 1; pi < firstPartPositions.length; pi++) {
        const d = Math.abs(firstPartPositions[pi] - chords[ci].position)
        if (d < bestD) { bestD = d; best = pi }
      }
      assignment[ci] = best
      totalDist += bestD
    }
    const avgDist = totalDist / chords.length

    if (avgDist <= MAX_DIST) {
      // Position alignment is good — apply and return
      for (let ci = 0; ci < chords.length; ci++) {
        const colIdx = assignment[ci]
        if (result[colIdx].chords.length === 0) {
          result[colIdx] = {
            ...result[colIdx],
            chords: [{ id: genId(), value: chords[ci].value, position: 0 }],
          }
        }
      }
      return result
    }
  }

  // Fallback: even distribution across all columns
  const spacing = Math.max(1, Math.floor(columns.length / chords.length))
  let lastUsed = -1
  for (let ci = 0; ci < chords.length; ci++) {
    let colIdx = ci === 0 ? 0 : Math.min(ci * spacing, columns.length - 1)
    // Avoid collisions
    if (colIdx <= lastUsed) colIdx = lastUsed + 1
    if (colIdx >= columns.length) break
    result[colIdx] = {
      ...result[colIdx],
      chords: [{ id: genId(), value: chords[ci].value, position: 0 }],
    }
    lastUsed = colIdx
  }

  return result
}

/**
 * Finds all <span class="tablatura"> blocks with proper nested-span depth tracking.
 */
function findTablaturaBlocks(html: string): string[] {
  const results: string[] = []
  const lower = html.toLowerCase()
  const marker = '<span class="tablatura">'
  let pos = 0

  while (true) {
    const start = lower.indexOf(marker, pos)
    if (start === -1) break

    let depth = 1
    let i = start + marker.length

    while (i < html.length && depth > 0) {
      const nextOpen  = lower.indexOf('<span', i)
      const nextClose = lower.indexOf('</span>', i)

      if (nextClose === -1) break

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        i = nextOpen + 5
      } else {
        depth--
        i = nextClose + 7
      }
    }

    if (depth === 0) {
      results.push(html.slice(start, i))
    }

    pos = start + 1
  }

  return results
}

/**
 * Pre-extracts all <span class="tablatura"> blocks from cifraHtml.
 * Replaces them with sentinels (__TAB_N__) and returns:
 *  - processedHtml: cifraHtml with sentinels
 *  - tabMap: map from sentinel → { columns, numStrings }
 */
function extractTabBlocks(cifraHtml: string): {
  processedHtml: string
  tabMap: Map<string, { columns: Line[]; numStrings: number }>
} {
  const tabMap = new Map<string, { columns: Line[]; numStrings: number }>()
  const tablataBlocks = findTablaturaBlocks(cifraHtml)

  let processedHtml = cifraHtml
  let tabIdx = 0

  for (const blockHtml of tablataBlocks) {
    const sentinel = `__TAB_${tabIdx++}__`
    const allColumns: Line[] = []
    let numStrings = 6

    // carryChords persists across cnt boundaries so a chord line that
    // appears BETWEEN (or BEFORE) cnt spans is picked up by the next part.
    let carryChords: ChordPosition[] | null = null

    const cntRe = /<span[^>]*class="cnt"[^>]*>([\s\S]*?)<\/span>/gi
    let cntMatch: RegExpExecArray | null
    let prevEnd = 0

    while ((cntMatch = cntRe.exec(blockHtml)) !== null) {
      // ── scan content BEFORE this cnt span for chord lines ──────────────
      const before = blockHtml.slice(prevEnd, cntMatch.index)
      for (const raw of before.split(/\r?\n/)) {
        if (isChordLine(raw)) carryChords = parseChordLine(raw)
      }
      prevEnd = cntMatch.index + cntMatch[0].length

      // ── process lines INSIDE this cnt span ─────────────────────────────
      const rawLines = cntMatch[1].split(/\r?\n/)
      let buffer: string[] = []

      const flushBuf = () => {
        if (buffer.length < 1) { buffer = []; return }
        numStrings = buffer.length
        const { columns, positions } = parseTabColumns(buffer)
        const cols = carryChords
          ? mapChordsToColumns(carryChords, columns, positions)
          : columns
        carryChords = null
        allColumns.push(...cols)
        buffer = []
      }

      for (const raw of rawLines) {
        const plain = decodeEntities(stripTags(raw))
        if (TAB_STRING_RE.test(plain.trim())) {
          buffer.push(plain.trim())
        } else {
          flushBuf()
          if (isChordLine(raw)) carryChords = parseChordLine(raw)
        }
      }
      flushBuf()
    }

    if (allColumns.length > 0) {
      tabMap.set(sentinel, { columns: allColumns, numStrings })
    }

    processedHtml = processedHtml.replace(blockHtml, `\n${sentinel}\n`)
  }

  return { processedHtml, tabMap }
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export interface ParsedSong {
  title: string
  artist: string
  songKey: string
  blocks: Block[]
  arrangement: { blockId: string; repeatCount: number }[]
}

export function parseCifraClub(html: string): ParsedSong {
  // ── Title ──
  const h1matches = [...html.matchAll(/<h1[^>]*>([^<]*)<\/h1>/gi)]
  const title = h1matches
    .map(m => decodeEntities(m[1]).trim())
    .find(t => t.length > 0 && !/cifra\s*club/i.test(t))
    || 'Sem título'

  // ── Artist ──
  const h2Match = html.match(/<h2[^>]*>\s*<a[^>]*>([^<]+)<\/a>/)
  const artist = h2Match ? decodeEntities(h2Match[1]).trim() : ''

  // ── Key ──
  let songKey = ''
  const keyMatch =
    html.match(/id="cifra_tom"[^]*?<a[^>]*>([A-G][#b]?m?)<\/a>/) ||
    html.match(/[Tt]om:\s*<a[^>]*>([A-G][#b]?m?)<\/a>/) ||
    html.match(/[Tt]om[:\s]+([A-G][#b]?m?)/)
  if (keyMatch) songKey = keyMatch[1].trim()

  // ── Capo ──
  let capo: number | undefined
  const capoMatch =
    html.match(/id="cifra_capo"[^>]*>(?:[^<]*?)?(\d+)[ªº°]?\s*casa/i) ||
    html.match(/capo[^<"]{0,10}?(\d+)[ªº°]?\s*casa/i) ||
    html.match(/capo[\s:]+(\d+)/i)
  if (capoMatch) { const n = parseInt(capoMatch[1]); if (n >= 1 && n <= 12) capo = n }

  // ── Tuning ──
  let tuning: string | undefined

  // 1. Tenta extrair do elemento dedicado (pode ter HTML interno — usa stripTags)
  const tuningElMatch =
    html.match(/id="cifra_afinacao"[^>]*>([\s\S]*?)<\/[a-z]+>/i) ||
    html.match(/id="cifra_afinacao"[^>]*>([^<]{2,})</)
  if (tuningElMatch) {
    const raw = decodeEntities(stripTags(tuningElMatch[1])).trim()
    if (raw) tuning = parseTuningRaw(raw) ?? (raw && !/^e\s*a\s*d\s*g\s*b\s*e$/i.test(raw) ? raw : undefined)
  }

  // 2. Tenta em meta/atributos: "data-tuning", "afinacao:" em qualquer lugar do HTML
  if (!tuning) {
    const metaMatch =
      html.match(/data-(?:tuning|afinacao)[^>]*=["']([^"']+)["']/i) ||
      html.match(/afina[çc][ãa]o\s*(?:Drop|Open|Tom|Dois|Meio|DADGAD)[^<\n"]{0,60}/i)
    if (metaMatch) tuning = parseTuningRaw(metaMatch[0]) ?? parseTuningRaw(metaMatch[1] ?? '')
  }

  // ── Cifra content ──
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i)
  if (!preMatch) return { title, artist, songKey, blocks: [], arrangement: [] }

  // ── Pre-extract tab blocks → replace with sentinels ──
  const { processedHtml, tabMap } = extractTabBlocks(preMatch[1])

  // ── Build section drafts ──
  type SectionDraft = {
    name: string
    type: BlockType
    lyricsLines: Line[]       // LYRICS_CHORDS or CHORDS lines
    tabColumns: Line[] | null // TAB columns if tab was found
    numStrings: number
    repeatCount: number
  }

  function emptySection(rawName: string): SectionDraft {
    const { cleanName, repeatCount } = extractRepeatCount(rawName)
    return { name: cleanName, type: normalizeSectionType(cleanName), lyricsLines: [], tabColumns: null, numStrings: 6, repeatCount }
  }

  const sections: SectionDraft[] = []
  let cur: SectionDraft = emptySection('Intro')
  let pendingChords: ChordPosition[] | null = null

  function flushPending() {
    if (pendingChords) {
      cur.lyricsLines.push(makeLine('', pendingChords))
      pendingChords = null
    }
  }

  function startSection(name: string) {
    flushPending()
    const hasContent = cur.lyricsLines.length > 0 || cur.tabColumns !== null
    if (hasContent || sections.length === 0) sections.push(cur)
    cur = emptySection(name)
  }

  for (const rawLine of processedHtml.split(/\r?\n/)) {
    // TAB sentinel
    const sentinelKey = rawLine.trim()
    if (tabMap.has(sentinelKey)) {
      flushPending()
      const { columns, numStrings } = tabMap.get(sentinelKey)!
      if (cur.tabColumns) {
        cur.tabColumns.push(...columns)
      } else {
        cur.tabColumns = columns
        cur.numStrings = numStrings
      }
      continue
    }

    // Section marker — may have chords on same line: "[Intro] <b>E</b> ..."
    const secMatch = rawLine.match(/^\[([^\]]+)\](.*)/)
    if (secMatch) {
      const secName = secMatch[1].trim()
      const rest = secMatch[2]
      startSection(secName)
      if (rest.trim() && isChordLine(rest)) {
        flushPending()
        pendingChords = parseChordLine(rest)
      }
      continue
    }

    if (isChordLine(rawLine)) {
      flushPending()
      pendingChords = parseChordLine(rawLine)
      continue
    }

    const plain = decodeEntities(stripTags(rawLine)).trimEnd()

    if (plain.trim() === '') {
      flushPending()
    } else {
      // Linhas que apenas repetem metadados já armazenados no cabeçalho são omitidas do corpo.
      // Ex: "Afinação Drop D: D A D G B E", "Afinação: D A D G B E", "Tom: Ré", "Capo: 2ª casa"
      const isMetaLine =
        /^afina[çc][ãa]o\b/i.test(plain) ||
        /^tom\s*[:\-–]/i.test(plain) ||
        /^capo\s*[:\-–]/i.test(plain) ||
        /^tom\s+[A-G][#b]?m?\s*$/i.test(plain)
      if (isMetaLine) {
        // Aproveita para extrair afinação se ainda não foi capturada do HTML
        if (!tuning) tuning = parseTuningRaw(plain)
        pendingChords = null
        continue
      }
      cur.lyricsLines.push(makeLine(plain, pendingChords ?? []))
      pendingChords = null
    }
  }

  flushPending()
  sections.push(cur)

  // ── Convert drafts to Blocks ──
  const headerBlock: Block = {
    id: genId(),
    name: 'Cabeçalho',
    type: 'header',
    sections: [{
      id: genId(),
      type: 'LYRICS_CHORDS',
      lines: [
        makeLine(title),
        ...(artist ? [makeLine(artist)] : []),
      ],
    }],
    order: 0,
    songKey: songKey || undefined,
    capo,
    tuning,
  }

  const contentBlocks: Block[] = []
  const arrangement: { blockId: string; repeatCount: number }[] = []
  let order = 1

  for (const sec of sections) {
    const hasTab = sec.tabColumns !== null && sec.tabColumns.length > 0
    const hasLyrics = sec.lyricsLines.length > 0

    if (!hasTab && !hasLyrics) continue

    const blockSections: Section[] = []

    if (hasLyrics) {
      const allChordOnly = sec.lyricsLines.every(l => l.text.trim() === '')
      if (allChordOnly) {
        blockSections.push({ id: genId(), type: 'CHORDS_ONLY', lines: sec.lyricsLines })
      } else {
        blockSections.push({ id: genId(), type: 'LYRICS_CHORDS', lines: sec.lyricsLines })
      }
    }

    if (hasTab) {
      blockSections.push({
        id: genId(),
        type: 'TAB',
        lines: sec.tabColumns!,
        instrument: sec.numStrings === 4 ? 'bass' : 'guitar',
      })
    }

    const blockId = genId()
    contentBlocks.push({
      id: blockId,
      name: sec.name,
      type: sec.type,
      sections: blockSections,
      order: order++,
    })
    arrangement.push({ blockId, repeatCount: sec.repeatCount })
  }

  return { title, artist, songKey, blocks: [headerBlock, ...contentBlocks], arrangement }
}
