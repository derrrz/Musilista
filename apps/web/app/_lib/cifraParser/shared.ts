import { BlockType, ChordPosition, Line } from '@/app/_lib/types'

// ─── Ids e construção de linha ────────────────────────────────────────────────

export function genId(): string {
  return Math.random().toString(36).slice(2, 11)
}

export function makeLine(text: string, chords: ChordPosition[] = []): Line {
  return { id: genId(), text, chords }
}

// ─── Reconhecimento de acorde ─────────────────────────────────────────────────

// Padrão estrito — usado no texto colado ("Colar Cifra") e para acordes
// entre parênteses no HTML do Cifra Club. Cobre a maioria das notações comuns:
// Am, C7, F#m, Bb/D, Gsus4, etc.
export const CHORD_PAT = /^[A-G][b#]?(m|M|maj|min|dim|aug|sus[24]?|add\d?)?(\d+)?(\+)?(\/[A-G][b#]?)?$/

export function isChordToken(token: string): boolean {
  return CHORD_PAT.test(token)
}

// Padrão mais permissivo — usado no texto plano do Bananacifras, cuja
// formatação de acorde varia mais (sufixos alfanuméricos livres). Mantido
// separado do CHORD_PAT estrito para não alterar o comportamento já
// validado desse caminho.
export const PLAIN_CHORD_PAT = /^[A-G][b#]?(?:m|M|maj|min|dim|aug|sus|add)?[0-9]?(?:[a-zA-Z0-9+#/]*)?(?:\/[A-G][b#]?)?$/

export function isPlainChordToken(token: string): boolean {
  const t = token.trim()
  return t.length > 0 && PLAIN_CHORD_PAT.test(t)
}

// Tokens de anotação tolerados numa linha de acorde além dos próprios acordes:
// contagem de repetição ("2x", "(2x)") e marcações de repetição por extenso
// ("repete", "bis"). Sem essa folga, uma linha como "Am F C 2x" cai inteira
// como texto de letra porque nem todo token bate no regex de acorde.
const ANNOTATION_TOKEN_RE = /^\(?(\d+x|repete|bis)\)?$/i

export function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  let hasRealChord = false
  for (const t of tokens) {
    if (isChordToken(t)) { hasRealChord = true; continue }
    if (/^[()[\]|]$/.test(t)) continue
    if (ANNOTATION_TOKEN_RE.test(t)) continue
    return false
  }
  return hasRealChord
}

// ─── Reconhecimento de tablatura ──────────────────────────────────────────────

// "E|-----|" "B|-3-5-|" com espaços opcionais antes (texto colado)
export const TAB_LINE_RE = /^\s*[EBADGe]\s*\|/

// Mesmo padrão sem espaço opcional (HTML do Cifra Club, já com stripTags aplicado)
export const TAB_STRING_RE = /^[EBGDAe]\|/

export function isTabLine(line: string): boolean {
  return TAB_LINE_RE.test(line)
}

// ─── Classificação de seção por nome ──────────────────────────────────────────

export function normalizeSectionType(raw: string): BlockType {
  const s = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/intro|interlud|abertura/.test(s)) return 'intro'
  // Pré-refrão/pre-chorus é tratado como "bridge": estruturalmente é uma
  // seção de transição entre verso e refrão, não o próprio refrão — checar
  // isso ANTES do regex de "chorus" evita que "pre-refrao" caia em chorus
  // só por conter a substring "refrao".
  if (/pre[\s-]?refra|pre[\s-]?chorus/.test(s)) return 'bridge'
  if (/verso|estrofe|parte|verse|strophe/.test(s)) return 'verse'
  if (/refrao|chorus|coro/.test(s)) return 'chorus'
  if (/ponte|bridge/.test(s)) return 'bridge'
  if (/solo|guitarra|violao|baixo|teclado|piano|tab/.test(s)) return 'solo'
  return 'unknown'
}

// ─── Contagem de repetição no nome da seção ───────────────────────────────────

/**
 * Extrai um sufixo opcional de repetição do nome de uma seção.
 * Reconhece padrões como: "Verso 2x", "Refrão (3x)", "Parte A x2"
 * A letra "x" é obrigatória para evitar falso positivo em "Parte 2", "Verso 1".
 * Retorna o nome limpo (sufixo removido) e a contagem (padrão 1).
 */
export function extractRepeatCount(raw: string): { cleanName: string; repeatCount: number } {
  const mNx = raw.match(/^(.*?)\s*\(?\s*(\d+)\s*x\s*\)?\s*$/i)
  if (mNx && mNx[2]) {
    const n = parseInt(mNx[2], 10)
    if (n >= 2 && n <= 16) return { cleanName: mNx[1].trim() || raw, repeatCount: n }
  }
  const mxN = raw.match(/^(.*?)\s*\(?\s*x\s*(\d+)\s*\)?\s*$/i)
  if (mxN && mxN[2]) {
    const n = parseInt(mxN[2], 10)
    if (n >= 2 && n <= 16) return { cleanName: mxN[1].trim() || raw, repeatCount: n }
  }
  return { cleanName: raw, repeatCount: 1 }
}

// ─── Capo / afinação ───────────────────────────────────────────────────────────

export function clampCapo(n: number): number | undefined {
  return n >= 1 && n <= 12 ? n : undefined
}

/** Extrai tom/afinação nomeada ou sequência de notas de um texto livre. */
export function parseTuningRaw(raw: string): string | undefined {
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

// ─── HTML utilities (usadas pelo parser de HTML do Cifra Club) ───────────────

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

export function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}
