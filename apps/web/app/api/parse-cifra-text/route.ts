import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth';

// ── Types (espelha os tipos internos do editor) ───────────────────────────────

type CP   = { id: string; value: string; position: number }
type Line = { id: string; text: string; chords: CP[] }
type LyricsSection  = { id: string; type: 'LYRICS_CHORDS'; lines: Line[] }
type ChordsSection  = { id: string; type: 'CHORDS_ONLY';   lines: Line[] }
type TabSection     = { id: string; type: 'TAB'; lines: Line[]; instrument: 'guitar' }
type Section = LyricsSection | ChordsSection | TabSection

type BlockType = 'header' | 'intro' | 'verse' | 'chorus' | 'bridge' | 'solo' | 'unknown'
type Block = { id: string; name: string; type: BlockType; sections: Section[]; order: number }

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 10) }

// Padrão de acorde — cobre maioria das notações: Am, C7, F#m, Bb/D, Gsus4, etc.
const CHORD_PAT = /^[A-G][b#]?(m|M|maj|min|dim|aug|sus[24]?|add\d?)?(\d+)?(\+)?(\/[A-G][b#]?)?$/

function isChordToken(t: string): boolean {
  return CHORD_PAT.test(t)
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  return tokens.length > 0 && tokens.every(t => isChordToken(t) || /^[()[\]|]$/.test(t))
}

function isTabLine(line: string): boolean {
  // "E|-----|" "B|-3-5-|" com espaços opcionais antes
  return /^\s*[EBADGe]\s*\|/.test(line)
}

function extractChords(chordLine: string): CP[] {
  const chords: CP[] = []
  for (const m of chordLine.matchAll(/\S+/g)) {
    if (isChordToken(m[0])) {
      chords.push({ id: uid(), value: m[0], position: m.index ?? 0 })
    }
  }
  return chords
}

function blockTypeFromName(name: string): BlockType {
  const s = name.toLowerCase()
  if (/^(intro|abertura)/.test(s)) return 'intro'
  if (/refr|chorus/.test(s)) return 'chorus'
  if (/pont|bridge/.test(s)) return 'bridge'
  if (/solo/.test(s)) return 'solo'
  if (/vers|parte|primeira|segunda|terceira|section/.test(s)) return 'verse'
  return 'unknown'
}

// ── Parser de seção (linhas dentro de um [bloco]) ────────────────────────────

function parseSection(rawLines: string[]): Section[] {
  const out: Section[] = []
  let lyrics: LyricsSection | null = null
  let i = 0

  const flushLyrics = () => {
    if (lyrics && lyrics.lines.length > 0) { out.push(lyrics); lyrics = null }
  }

  while (i < rawLines.length) {
    const line = rawLines[i]

    // Ignora rótulos "Parte N De M" e setas de strumming
    if (/^\s*(parte\s+\d+\s+de\s+\d+|↓|↑)\s*$/i.test(line)) { i++; continue }

    // ── TAB: linha de corda (E|, B|, etc.) ──
    if (isTabLine(line)) {
      flushLyrics()
      const tabLines: Line[] = []
      while (i < rawLines.length) {
        const tl = rawLines[i]
        if (isTabLine(tl)) {
          tabLines.push({ id: uid(), text: tl.trimEnd(), chords: [] })
          i++
        } else if (!tl.trim()) {
          // linha vazia entre grupos de TAB — continua se o próximo for TAB
          if (i + 1 < rawLines.length && isTabLine(rawLines[i + 1])) { i++; continue }
          break
        } else {
          // linha de texto antes de TAB (ex: anotação de acorde "Am" acima da tablatura)
          tabLines.push({ id: uid(), text: tl.trimEnd(), chords: [] })
          i++
        }
      }
      if (tabLines.length > 0) out.push({ id: uid(), type: 'TAB', lines: tabLines, instrument: 'guitar' })
      continue
    }

    // ── Linha de acorde(s) ──
    if (isChordLine(line)) {
      const chords = extractChords(line)

      // Olha a próxima linha não-vazia: é lyric?
      let ni = i + 1
      while (ni < rawLines.length && rawLines[ni] === '') ni++
      const nxt = ni < rawLines.length ? rawLines[ni] : ''
      const nextIsLyric = nxt && !isChordLine(nxt) && !isTabLine(nxt) && !nxt.startsWith('[')

      if (!lyrics) lyrics = { id: uid(), type: 'LYRICS_CHORDS', lines: [] }

      if (nextIsLyric) {
        lyrics.lines.push({ id: uid(), text: nxt.trimEnd(), chords })
        i = ni + 1
      } else {
        // Acorde sem letra abaixo → linha vazia com posição de acorde
        lyrics.lines.push({ id: uid(), text: '', chords })
        i++
      }
      continue
    }

    // ── Linha vazia ──
    if (!line.trim()) { i++; continue }

    // ── Texto comum ──
    if (!lyrics) lyrics = { id: uid(), type: 'LYRICS_CHORDS', lines: [] }
    lyrics.lines.push({ id: uid(), text: line.trimEnd(), chords: [] })
    i++
  }

  flushLyrics()
  return out.length > 0 ? out : [{ id: uid(), type: 'LYRICS_CHORDS', lines: [] }]
}

// ── Parser principal ──────────────────────────────────────────────────────────

function parseCifraText(raw: string): { title: string; artist: string; blocks: Block[] } {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // Extrai título e artista das primeiras linhas não-metadata
  const META_SKIP = [/^cifra:/i, /^tom:/i, /^favoritar/i, /^capo/i, /^\s*$/]
  let li = 0
  let title = ''
  let artist = ''

  while (li < lines.length && (!title || !artist)) {
    const l = lines[li++]
    if (!l.trim()) continue
    if (META_SKIP.some(p => p.test(l))) continue
    // Linha que começa com [ é seção — para de buscar cabeçalho
    if (l.startsWith('[')) { li--; break }
    if (!title) { title = l.trim(); continue }
    if (!artist) { artist = l.trim(); continue }
  }

  const blocks: Block[] = []

  // Bloco de cabeçalho
  const headerLines: Line[] = [{ id: uid(), text: title, chords: [] }]
  if (artist) headerLines.push({ id: uid(), text: artist, chords: [] })
  blocks.push({
    id: uid(), name: title, type: 'header', order: 0,
    sections: [{ id: uid(), type: 'LYRICS_CHORDS', lines: headerLines }],
  })

  // Agrupa linhas por [Seção]
  type SGroup = { name: string; lines: string[] }
  const groups: SGroup[] = []
  let cur: SGroup | null = null

  for (let i = li; i < lines.length; i++) {
    const m = lines[i].match(/^\[(.+?)\](.*)?$/)
    if (m) {
      if (cur) groups.push(cur)
      cur = { name: m[1].trim(), lines: m[2]?.trim() ? [m[2].trim()] : [] }
    } else if (cur) {
      cur.lines.push(lines[i])
    }
  }
  if (cur) groups.push(cur)

  let order = 1
  for (const g of groups) {
    // Ignora grupos de seção que são apenas rótulos de tab (ex: "[Dedilhado - Intro]" sem linhas úteis)
    const sections = parseSection(g.lines)
    blocks.push({
      id: uid(), name: g.name,
      type: blockTypeFromName(g.name),
      order: order++, sections,
    })
  }

  return { title: title || 'Sem título', artist, blocks }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const text = await req.text()
  if (!text?.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
  if (text.length > 200_000) return NextResponse.json({ error: 'Cifra muito grande (máx 200 KB)' }, { status: 413 })

  try {
    const result = parseCifraText(text)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
