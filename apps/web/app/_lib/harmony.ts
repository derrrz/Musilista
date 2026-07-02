// ─── Escala cromática ─────────────────────────────────────────────────────────

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Tonalidades que convencionalmente usam bemóis
const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm',
])

// ─── Primitivas de nota ────────────────────────────────────────────────────────

/** Índice cromático de uma nota (0–11), -1 se inválida. */
export function noteToSemitone(note: string): number {
  const si = SHARPS.indexOf(note)
  if (si !== -1) return si
  return FLATS.indexOf(note)
}

/** Nota a partir de índice cromático (normalizado mod 12). */
export function semitoneToNote(n: number, flats: boolean): string {
  return (flats ? FLATS : SHARPS)[((n % 12) + 12) % 12]
}

/** Transpõe uma nota isolada por N semitons. */
export function transposeNote(note: string, semitones: number, flats: boolean): string {
  const idx = noteToSemitone(note)
  if (idx === -1) return note
  return semitoneToNote(idx + semitones, flats)
}

/** Se a tonalidade convenciona bemóis. */
export function preferFlats(key: string): boolean {
  // Extrai apenas root + 'm' para lookup (ignora "maj7", "7", etc.)
  const m = key.match(/^([A-G][#b]?m?)/)
  return FLAT_KEYS.has(m?.[1] ?? key)
}

// ─── Transposição de acordes ──────────────────────────────────────────────────

/**
 * Transpõe um acorde completo por N semitons.
 * Suporta:
 *   - Acordes simples:   C, Am, F#m, Bb7, Cmaj7, D5, G#dim
 *   - Slash chords:      G/B, Am/E, C/G
 * O sufixo de qualidade (m, 7, maj7, b5, dim, sus4, 5, …) é preservado intacto.
 */
export function transposeChord(chord: string, semitones: number, flats = false): string {
  if (!semitones) return chord

  // Slash chord — transpõe root e nota de baixo separadamente
  const slashIdx = chord.lastIndexOf('/')
  if (slashIdx > 0) {
    const main = chord.slice(0, slashIdx)
    const bass = chord.slice(slashIdx + 1)
    const bassRoot = bass.match(/^([A-G][#b]?)(.*)$/)
    if (bassRoot) {
      const transposedBass = transposeNote(bassRoot[1], semitones, flats) + bassRoot[2]
      return transposeChord(main, semitones, flats) + '/' + transposedBass
    }
  }

  // Acorde normal — separa root do sufixo
  const m = chord.match(/^([A-G][#b]?)(.*)$/)
  if (!m) return chord

  const [, root, quality] = m
  return transposeNote(root, semitones, flats) + quality
}

/**
 * Transpõe a tonalidade (songKey), escolhendo a enarmonização correta
 * para a nova tonalidade.
 *
 * Exemplos:
 *   transposeKey('C',  1)  → 'Db'  (não C#, porque Db é convenção)
 *   transposeKey('G',  1)  → 'Ab'
 *   transposeKey('Am', 2)  → 'Bm'
 *   transposeKey('Dm', 1)  → 'Ebm'
 */
export function transposeKey(key: string, semitones: number): string {
  const m = key.match(/^([A-G][#b]?)(.*)$/)
  if (!m) return key

  const [, root, suffix] = m

  // Transpõe com sharps para obter o candidato neutro
  const candidateRoot = transposeNote(root, semitones, false)
  const candidate = candidateRoot + suffix

  // Decide enarmonização baseada na nova tonalidade
  const useFlats = preferFlats(candidate)
  const finalRoot = transposeNote(root, semitones, useFlats)
  return finalRoot + suffix
}

// ─── Campo harmônico ──────────────────────────────────────────────────────────

/** Intervalos do campo harmônico maior (semitons a partir da tônica). */
export const MAJOR_FIELD = [0, 2, 4, 5, 7, 9, 11]

/** Qualidades diatônicas no campo maior: I maj, II m, III m, IV maj, V maj, VI m, VII dim */
export const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'] as const

/**
 * Verifica se a raiz de um acorde pertence ao campo harmônico maior da tonalidade.
 * (Usado para "destacar fora do campo harmônico".)
 */
export function isInKey(note: string, key: string): boolean {
  const km = key.match(/^([A-G][#b]?)/)
  if (!km) return false
  const keyIdx  = noteToSemitone(km[1])
  const noteIdx = noteToSemitone(note)
  if (keyIdx === -1 || noteIdx === -1) return false
  const interval = ((noteIdx - keyIdx) % 12 + 12) % 12
  return MAJOR_FIELD.includes(interval)
}

/**
 * Retorna o grau romano de um acorde dentro de uma tonalidade maior.
 * Ex: getDegree('Am', 'C') → 'VIm'
 * Retorna null se o acorde estiver fora do campo.
 */
export function getDegree(chord: string, key: string): string | null {
  const cm = chord.match(/^([A-G][#b]?)(.*)$/)
  const km = key.match(/^([A-G][#b]?)/)
  if (!cm || !km) return null

  const chordRoot = cm[1]
  const keyRoot   = km[1]
  const interval  = ((noteToSemitone(chordRoot) - noteToSemitone(keyRoot)) % 12 + 12) % 12
  const degree    = MAJOR_FIELD.indexOf(interval)
  if (degree === -1) return null

  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
  return ROMAN[degree] + MAJOR_QUALITIES[degree]
}
