import { NextRequest, NextResponse } from 'next/server'
import { Block, BlockType, Line, ChordPosition, Section } from '@/app/_lib/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function makeLine(text: string, chords: ChordPosition[] = []): Line {
  return { id: genId(), text, chords }
}

// ─── HTML utilities ───────────────────────────────────────────────────────────

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

// ─── Chord line parser ────────────────────────────────────────────────────────

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

// Cifra Club string line pattern: "E|--0--2--|" (E, B, G, D, A, e)
const TAB_STRING_RE = /^[EBGDAe]\|/

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
 */
function parseTabColumns(stringLines: string[]): { columns: Line[]; positions: number[] } {
  const numStrings = stringLines.length
  if (numStrings < 4) return { columns: [], positions: [] }

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
        if (buffer.length < 4) { buffer = []; return }
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

// ─── Section type mapping ─────────────────────────────────────────────────────

function normalizeSectionType(raw: string): BlockType {
  const s = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (/intro|interlud|abertura/.test(s)) return 'intro'
  if (/verso|estrofe|parte|verse|strophe/.test(s)) return 'verse'
  if (/refrao|chorus|coro/.test(s)) return 'chorus'
  if (/ponte|bridge/.test(s)) return 'bridge'
  if (/solo|guitarra|violao|baixo|teclado|piano|tab/.test(s)) return 'solo'
  return 'unknown'
}

/**
 * Extracts an optional repeat-count suffix from a Cifra Club section name.
 * Handles patterns like: "Verso 2x", "Refrão (3x)", "Parte A x2"
 * The "x" letter is required to avoid false positives on "Parte 2", "Verso 1" etc.
 * Returns the clean name (suffix stripped) and the count (defaults to 1).
 */
function extractRepeatCount(raw: string): { cleanName: string; repeatCount: number } {
  // "Nx" style: "2x", "(2x)", "( 2x )"
  const mNx = raw.match(/^(.*?)\s*\(?\s*(\d+)\s*x\s*\)?\s*$/i)
  if (mNx && mNx[2]) {
    const n = parseInt(mNx[2], 10)
    if (n >= 2 && n <= 16) return { cleanName: mNx[1].trim() || raw, repeatCount: n }
  }
  // "xN" style: "x2", "(x2)", "( x 2 )"
  const mxN = raw.match(/^(.*?)\s*\(?\s*x\s*(\d+)\s*\)?\s*$/i)
  if (mxN && mxN[2]) {
    const n = parseInt(mxN[2], 10)
    if (n >= 2 && n <= 16) return { cleanName: mxN[1].trim() || raw, repeatCount: n }
  }
  return { cleanName: raw, repeatCount: 1 }
}

// ─── Main parser ──────────────────────────────────────────────────────────────

interface ParsedSong {
  title: string
  artist: string
  songKey: string
  blocks: Block[]
  arrangement: { blockId: string; repeatCount: number }[]
}

function parseCifraClub(html: string): ParsedSong {
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

  // Helper: extrai notas ou nome de afinação de uma string raw
  function parseTuningRaw(raw: string): string | undefined {
    // Padrão "Afinação Drop D: D A D G B E" — captura as notas após ":"
    const notesAfterColon = raw.match(/:\s*([A-Gb#♭♯\s]{4,})$/)
    if (notesAfterColon) {
      const notes = notesAfterColon[1].trim()
      if (!/^e\s*a\s*d\s*g\s*b\s*e$/i.test(notes)) return notes
      return undefined
    }
    // Padrão "Drop D", "Open G", "DADGAD" etc. direto
    const namedRe = /\b(Drop\s+[A-Gb#]+|Open\s+[A-G]|DADGAD|Double\s+Drop\s+[A-G]|Tom\s+e?\s*meio|Meio\s+tom|Tom\s+abaixo|Dois\s+tons)\b/i
    const named = raw.match(namedRe)
    if (named) return named[0].trim()
    // Sequência de 6 notas, ex: "D A D G B E"
    const sixNotes = raw.match(/\b([A-Gb#]{1,2})\s+([A-Gb#]{1,2})\s+([A-Gb#]{1,2})\s+([A-Gb#]{1,2})\s+([A-Gb#]{1,2})\s+([A-Gb#]{1,2})\b/)
    if (sixNotes) {
      const seq = sixNotes.slice(1).join(' ')
      if (!/^e\s*a\s*d\s*g\s*b\s*e$/i.test(seq)) return seq
    }
    return undefined
  }

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
    if (metaMatch) tuning = parseTuningRaw(metaMatch[0]) ?? parseTuningRaw(metaMatch[1] ?? '')}


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

// ─── Route handler ────────────────────────────────────────────────────────────

// ── Parser de texto plano (formato "acordes acima das letras") ────────────────
// Usado pelo Bananacifras e outros sites que entregam texto em vez de HTML

const CHORD_RE = /^[A-G][b#]?(?:m|M|maj|min|dim|aug|sus|add)?[0-9]?(?:[a-zA-Z0-9+#/]*)?(?:\/[A-G][b#]?)?$/

function isChordToken(word: string): boolean {
  return CHORD_RE.test(word.trim()) && word.trim().length > 0
}

function isPlainChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  return tokens.length > 0 && tokens.every(isChordToken)
}

const SECTION_RE = /^(intro|verso|pré-refrão|pre-refrao|pre-refrão|refrão|refrao|coro|ponte|solo|final|interludio|interlúdio|outro|bridge|chorus|verse|pre-chorus)\b/i
const SECTION_NAMES: Record<string, string> = {
  intro: 'Intro', verso: 'Verso', 'pré-refrão': 'Pré-Refrão', 'pre-refrao': 'Pré-Refrão', 'pre-refrão': 'Pré-Refrão',
  refrão: 'Refrão', refrao: 'Refrão', coro: 'Refrão', ponte: 'Ponte', solo: 'Solo',
  final: 'Final', interludio: 'Interlúdio', interlúdio: 'Interlúdio', outro: 'Final',
  bridge: 'Ponte', chorus: 'Refrão', verse: 'Verso', 'pre-chorus': 'Pré-Refrão',
}
const BLOCK_TYPES: Record<string, string> = {
  Intro: 'intro', Verso: 'verse', 'Pré-Refrão': 'bridge', Refrão: 'chorus',
  Ponte: 'bridge', Solo: 'solo', Final: 'unknown', Interlúdio: 'bridge',
}

function parsePlainTextChords(
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
    const blockType = (BLOCK_TYPES[currentBlockName] ?? 'unknown') as BlockType
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

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'Cache-Control': 'no-cache',
  }

  // ── Bananacifras ─────────────────────────────────────────────────────────────
  // Estratégia 1a: CDN tab.js via tabId obtido da busca CDN (sem Cloudflare)
  // Estratégia 1b: fetch direto do HTML (funciona quando Cloudflare está leniente)
  // Estratégia 2: CifraClub com o mesmo slug artista/música
  if (parsed.hostname.endsWith('bananacifras.com')) {
    const base = 'https://www.bananacifras.com'

    // Extrai slugs do path: /tipo/letra/artistaSlug/musicaSlug
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const artistSlug = pathParts[2] ?? ''
    const songSlugRaw = pathParts[3] ?? ''

    // CDN de busca: retorna [tabId, songSlug, songTitle, artistSlug, artistName, hasChords]
    // Não passa pelo Cloudflare — funciona do servidor
    let cdnTitle = songSlugRaw.replace(/-/g, ' ')
    let cdnArtist = artistSlug.replace(/-/g, ' ')
    let cdnTabId: number | null = null
    if (artistSlug && songSlugRaw) {
      const q = `${artistSlug.replace(/-/g, ' ')} ${songSlugRaw.replace(/-/g, ' ')}`
      const cdnResults = await fetch(
        `https://cifra.b-cdn.net/searchapi/song?BR=1&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': `${base}/` }, signal: AbortSignal.timeout(6_000) },
      ).then(r => r.json()).catch(() => []) as [number, string, string, string, string][]
      const best = cdnResults.find(r => r[1] === songSlugRaw && r[3] === artistSlug) ?? cdnResults[0]
      if (best) {
        cdnTabId  = best[0] ?? null
        cdnTitle  = best[2] || cdnTitle
        cdnArtist = best[4] || cdnArtist
      }
    }

    // Estratégia 1a: tab.js via tabId — endpoint JSON que normalmente não exige verificação
    if (cdnTabId) {
      for (const tabUrl of [
        `${base}/json/tab.js?id=${cdnTabId}`,
        `https://cifra.b-cdn.net/json/tab.js?id=${cdnTabId}`,
      ]) {
        try {
          const tabData = await fetch(tabUrl, {
            headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': `${base}/` },
            signal: AbortSignal.timeout(8_000),
          }).then(r => r.ok ? r.json() : null).catch(() => null) as { content?: string; tone?: string; capo?: string } | null
          if (tabData?.content) {
            const result = parsePlainTextChords(tabData.content, cdnTitle, cdnArtist, tabData.tone, tabData.capo)
            if (result.blocks.length > 0) return NextResponse.json(result)
          }
        } catch { /* continua */ }
      }
    }

    // Estratégia 1b: fetch HTML do Bananacifras (pode ser bloqueado pelo Cloudflare)
    try {
      const songHtml = await fetch(url, {
        headers: { ...BROWSER_HEADERS, 'Referer': `${base}/` },
        signal: AbortSignal.timeout(8_000),
      }).then(r => r.ok ? r.text() : null)

      if (songHtml) {
        const songdataMatch = songHtml.match(/songdata\s*=\s*(\{[^}]+\})/)
        if (songdataMatch) {
          const songdata = JSON.parse(songdataMatch[1]) as { tab_id: number; track_name: string; artist_name: string }
          const versionMatch = songHtml.match(/"json":"\/json\/tab\.js\?id=\d+&v=([^"]+)"/)
          const tabUrl = versionMatch
            ? `${base}/json/tab.js?id=${songdata.tab_id}&v=${versionMatch[1]}`
            : `${base}/json/tab.js?id=${songdata.tab_id}`
          const tabData = await fetch(tabUrl,
            { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': url }, signal: AbortSignal.timeout(8_000) },
          ).then(r => r.json()).catch(() => null) as { content?: string; tone?: string; capo?: string } | null
          if (tabData?.content) {
            const result = parsePlainTextChords(tabData.content, songdata.track_name, songdata.artist_name, tabData.tone, tabData.capo)
            if (result.blocks.length > 0) return NextResponse.json(result)
          }
        }
      }
    } catch { /* Cloudflare block — cai no fallback */ }

    // Estratégia 2: CifraClub com o mesmo slug (artista e música geralmente são iguais)
    if (artistSlug && songSlugRaw) {
      const songSlugVariants = [...new Set([
        songSlugRaw,
        songSlugRaw.replace(/-completa$/, '').replace(/-simplificada$/, ''),
        songSlugRaw.split('-').slice(0, 3).join('-'),
      ])]
      for (const slug of songSlugVariants) {
        const ccUrl = `https://www.cifraclub.com.br/${artistSlug}/${slug}/`
        try {
          const res = await fetch(ccUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8_000) })
          if (!res.ok) continue
          const html = await res.text()
          const result = parseCifraClub(html)
          if (result.blocks.length > 0) {
            if (!result.title || result.title === 'Sem título') result.title = cdnTitle
            if (!result.artist) result.artist = cdnArtist
            return NextResponse.json(result)
          }
        } catch { continue }
      }
    }

    return NextResponse.json(
      { error: `Não foi possível importar "${cdnTitle}". Tente buscar pelo CifraClub.` },
      { status: 502 },
    )
  }

  const SUPPORTED = ['cifraclub.com.br']
  if (!SUPPORTED.some(h => parsed.hostname.endsWith(h))) {
    return NextResponse.json(
      { error: `Site não suportado: ${parsed.hostname}` },
      { status: 400 }
    )
  }

  let html: string
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    return NextResponse.json(
      { error: `Não foi possível acessar a URL: ${(err as Error).message}` },
      { status: 502 }
    )
  }

  const result = parseCifraClub(html)

  // Debug: log TAB sections and their chord-labelled columns
  result.blocks.forEach(b => {
    b.sections.filter(s => s.type === 'TAB').forEach(s => {
      const labelled = s.lines.filter(l => l.chords.length > 0)
      console.log(`[TAB] "${b.name}" — ${s.lines.length} cols, ${labelled.length} with chord labels:`, labelled.map(l => l.chords[0]?.value))
    })
  })

  if (result.blocks.length === 0) {
    return NextResponse.json(
      { error: 'Não foi possível extrair a cifra desta página.' },
      { status: 422 }
    )
  }

  return NextResponse.json(result)
}

// POST: recebe HTML bruto (enviado pelo browser via proxy CORS) e parseia
export async function POST(req: NextRequest) {
  const html = await req.text().catch(() => '')
  if (!html || html.length < 100) {
    return NextResponse.json({ error: 'html body required' }, { status: 400 })
  }
  const result = parseCifraClub(html)
  if (result.blocks.length === 0) {
    return NextResponse.json({ error: 'Não foi possível extrair a cifra desta página.' }, { status: 422 })
  }
  return NextResponse.json(result)
}
