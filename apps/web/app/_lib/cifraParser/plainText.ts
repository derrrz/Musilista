import { Block, ChordPosition, Line, Section } from '@/app/_lib/types'
import {
  clampCapo,
  genId,
  isChordLine,
  isChordToken,
  isTabLine,
  normalizeSectionType,
  parseTuningRaw,
} from './shared'

// ── Parser de texto colado ("Colar Cifra") ────────────────────────────────────
// Entrada: texto estilo Cifra Club — título/artista nas primeiras linhas,
// seções marcadas por "[Nome]", acordes numa linha acima da letra.

function extractChords(chordLine: string): ChordPosition[] {
  const chords: ChordPosition[] = []
  for (const m of chordLine.matchAll(/\S+/g)) {
    if (isChordToken(m[0])) {
      chords.push({ id: genId(), value: m[0], position: m.index ?? 0 })
    }
  }
  return chords
}

// ── Parser de seção (linhas dentro de um [bloco]) ────────────────────────────

function parseSection(rawLines: string[]): Section[] {
  const out: Section[] = []
  let lyrics: Section | null = null
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
          tabLines.push({ id: genId(), text: tl.trimEnd(), chords: [] })
          i++
        } else if (!tl.trim()) {
          // linha vazia entre grupos de TAB — continua se o próximo for TAB
          if (i + 1 < rawLines.length && isTabLine(rawLines[i + 1])) { i++; continue }
          break
        } else {
          // linha de texto antes de TAB (ex: anotação de acorde "Am" acima da tablatura)
          tabLines.push({ id: genId(), text: tl.trimEnd(), chords: [] })
          i++
        }
      }
      if (tabLines.length > 0) out.push({ id: genId(), type: 'TAB', lines: tabLines, instrument: 'guitar' })
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

      if (!lyrics) lyrics = { id: genId(), type: 'LYRICS_CHORDS', lines: [] }

      if (nextIsLyric) {
        lyrics.lines.push({ id: genId(), text: nxt.trimEnd(), chords })
        i = ni + 1
      } else {
        // Acorde sem letra abaixo → linha vazia com posição de acorde
        lyrics.lines.push({ id: genId(), text: '', chords })
        i++
      }
      continue
    }

    // ── Linha vazia ──
    if (!line.trim()) { i++; continue }

    // ── Texto comum ──
    if (!lyrics) lyrics = { id: genId(), type: 'LYRICS_CHORDS', lines: [] }
    lyrics.lines.push({ id: genId(), text: line.trimEnd(), chords: [] })
    i++
  }

  flushLyrics()
  return out.length > 0 ? out : [{ id: genId(), type: 'LYRICS_CHORDS', lines: [] }]
}

// ── Parser principal ──────────────────────────────────────────────────────────

export function parseCifraText(raw: string): { title: string; artist: string; blocks: Block[] } {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  // Extrai título, artista e metadados (tom/capo/afinação) das primeiras linhas.
  let songKey: string | undefined
  let capo: number | undefined
  let tuning: string | undefined

  function captureMeta(l: string): boolean {
    const tomMatch = l.match(/^tom:\s*(.+)/i)
    if (tomMatch) { songKey = tomMatch[1].trim(); return true }
    const capoMatch = l.match(/^capo:\s*(\d+)/i)
    if (capoMatch) { capo = clampCapo(parseInt(capoMatch[1], 10)); return true }
    const afinacaoMatch = l.match(/^afina[çc][ãa]o:?\s*(.+)/i)
    if (afinacaoMatch) { tuning = parseTuningRaw(afinacaoMatch[0]) ?? afinacaoMatch[1].trim(); return true }
    if (/^favoritar/i.test(l)) return true
    return false
  }

  let li = 0
  let title = ''
  let artist = ''

  while (li < lines.length && (!title || !artist)) {
    const l = lines[li++]
    if (!l.trim()) continue
    if (captureMeta(l)) continue
    // Linha que começa com [ é seção — para de buscar cabeçalho
    if (l.startsWith('[')) { li--; break }
    if (!title) { title = l.trim(); continue }
    if (!artist) { artist = l.trim(); continue }
  }

  const blocks: Block[] = []

  // Agrupa linhas por [Seção]. Metadados soltos (Tom/Capo/Afinação) podem
  // aparecer tanto antes do primeiro marcador quanto dentro de um grupo —
  // captura nos dois casos, ANTES de montar o bloco de cabeçalho (que
  // precisa dos valores finais de songKey/capo/tuning).
  type SGroup = { name: string; lines: string[] }
  const groups: SGroup[] = []
  let cur: SGroup | null = null

  for (let i = li; i < lines.length; i++) {
    const l = lines[i]
    const m = l.match(/^\[(.+?)\](.*)?$/)
    if (m) {
      if (cur) groups.push(cur)
      cur = { name: m[1].trim(), lines: m[2]?.trim() ? [m[2].trim()] : [] }
    } else {
      if (captureMeta(l)) continue
      if (cur) cur.lines.push(l)
    }
  }
  if (cur) groups.push(cur)

  // Bloco de cabeçalho — construído só agora, já com songKey/capo/tuning
  // totalmente capturados pelo passo acima.
  const headerLines: Line[] = [{ id: genId(), text: title, chords: [] }]
  if (artist) headerLines.push({ id: genId(), text: artist, chords: [] })
  blocks.push({
    id: genId(), name: title, type: 'header', order: 0,
    sections: [{ id: genId(), type: 'LYRICS_CHORDS', lines: headerLines }],
    songKey, capo, tuning,
  })

  let order = 1
  for (const g of groups) {
    const sections = parseSection(g.lines)
    blocks.push({
      id: genId(), name: g.name,
      type: normalizeSectionType(g.name),
      order: order++, sections,
    })
  }

  return { title: title || 'Sem título', artist, blocks }
}
