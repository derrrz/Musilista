// ─── Chord voicing data ──────────────────────────────────────────────────────
//
// frets: [string6(E), string5(A), string4(D), string3(G), string2(B), string1(e)]
//   -1 = muted, 0 = open, 1..24 = absolute fret number
//
export interface ChordVoicing {
  frets: [number, number, number, number, number, number]
}

// ─── Library ─────────────────────────────────────────────────────────────────

const LIBRARY: Record<string, ChordVoicing> = {
  // ── Major ──
  'C':    { frets: [-1, 3, 2, 0, 1, 0] },
  'C#':   { frets: [-1, 4, 3, 1, 2, 1] },
  'Db':   { frets: [-1, 4, 3, 1, 2, 1] },
  'D':    { frets: [-1, -1, 0, 2, 3, 2] },
  'D#':   { frets: [-1, -1, 1, 3, 4, 3] },
  'Eb':   { frets: [-1, -1, 1, 3, 4, 3] },
  'E':    { frets: [0, 2, 2, 1, 0, 0] },
  'F':    { frets: [1, 3, 3, 2, 1, 1] },
  'F#':   { frets: [2, 4, 4, 3, 2, 2] },
  'Gb':   { frets: [2, 4, 4, 3, 2, 2] },
  'G':    { frets: [3, 2, 0, 0, 0, 3] },
  'G#':   { frets: [4, 6, 6, 5, 4, 4] },
  'Ab':   { frets: [4, 6, 6, 5, 4, 4] },
  'A':    { frets: [-1, 0, 2, 2, 2, 0] },
  'A#':   { frets: [-1, 1, 3, 3, 3, 1] },
  'Bb':   { frets: [-1, 1, 3, 3, 3, 1] },
  'B':    { frets: [-1, 2, 4, 4, 4, 2] },

  // ── Minor ──
  'Cm':   { frets: [-1, 3, 5, 5, 4, 3] },
  'C#m':  { frets: [-1, 4, 6, 6, 5, 4] },
  'Dbm':  { frets: [-1, 4, 6, 6, 5, 4] },
  'Dm':   { frets: [-1, -1, 0, 2, 3, 1] },
  'D#m':  { frets: [-1, -1, 1, 3, 4, 2] },
  'Ebm':  { frets: [-1, -1, 1, 3, 4, 2] },
  'Em':   { frets: [0, 2, 2, 0, 0, 0] },
  'Fm':   { frets: [1, 3, 3, 1, 1, 1] },
  'F#m':  { frets: [2, 4, 4, 2, 2, 2] },
  'Gbm':  { frets: [2, 4, 4, 2, 2, 2] },
  'Gm':   { frets: [3, 5, 5, 3, 3, 3] },
  'G#m':  { frets: [4, 6, 6, 4, 4, 4] },
  'Abm':  { frets: [4, 6, 6, 4, 4, 4] },
  'Am':   { frets: [-1, 0, 2, 2, 1, 0] },
  'A#m':  { frets: [-1, 1, 3, 3, 2, 1] },
  'Bbm':  { frets: [-1, 1, 3, 3, 2, 1] },
  'Bm':   { frets: [-1, 2, 4, 4, 3, 2] },

  // ── Dominant 7th ──
  'C7':   { frets: [-1, 3, 2, 3, 1, 0] },
  'C#7':  { frets: [-1, 4, 3, 4, 2, 1] },
  'Db7':  { frets: [-1, 4, 3, 4, 2, 1] },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2] },
  'D#7':  { frets: [-1, -1, 1, 3, 2, 3] },
  'Eb7':  { frets: [-1, -1, 1, 3, 2, 3] },
  'E7':   { frets: [0, 2, 0, 1, 0, 0] },
  'F7':   { frets: [1, 3, 1, 2, 1, 1] },
  'F#7':  { frets: [2, 4, 2, 3, 2, 2] },
  'Gb7':  { frets: [2, 4, 2, 3, 2, 2] },
  'G7':   { frets: [3, 2, 0, 0, 0, 1] },
  'G#7':  { frets: [4, 6, 4, 5, 4, 4] },
  'Ab7':  { frets: [4, 6, 4, 5, 4, 4] },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0] },
  'A#7':  { frets: [-1, 1, 3, 1, 3, 1] },
  'Bb7':  { frets: [-1, 1, 3, 1, 3, 1] },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2] },

  // ── Minor 7th ──
  'Cm7':  { frets: [-1, 3, 5, 3, 4, 3] },
  'C#m7': { frets: [-1, 4, 6, 4, 5, 4] },
  'Dbm7': { frets: [-1, 4, 6, 4, 5, 4] },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1] },
  'D#m7': { frets: [-1, -1, 1, 3, 2, 2] },
  'Ebm7': { frets: [-1, -1, 1, 3, 2, 2] },
  'Em7':  { frets: [0, 2, 2, 0, 3, 0] },
  'Fm7':  { frets: [1, 3, 3, 1, 4, 1] },
  'F#m7': { frets: [2, 4, 4, 2, 5, 2] },
  'Gbm7': { frets: [2, 4, 4, 2, 5, 2] },
  'Gm7':  { frets: [3, 5, 3, 3, 3, 3] },
  'G#m7': { frets: [4, 6, 4, 4, 4, 4] },
  'Abm7': { frets: [4, 6, 4, 4, 4, 4] },
  'Am7':  { frets: [-1, 0, 2, 0, 1, 0] },
  'A#m7': { frets: [-1, 1, 3, 1, 2, 1] },
  'Bbm7': { frets: [-1, 1, 3, 1, 2, 1] },
  'Bm7':  { frets: [-1, 2, 4, 2, 3, 2] },

  // ── Major 7th (7M) ──
  'C7M':   { frets: [-1, 3, 2, 0, 0, 0] },
  'C#7M':  { frets: [-1, 4, 3, 1, 1, 1] },
  'Db7M':  { frets: [-1, 4, 3, 1, 1, 1] },
  'D7M':   { frets: [-1, -1, 0, 2, 2, 2] },
  'D#7M':  { frets: [-1, -1, 1, 3, 3, 3] },
  'Eb7M':  { frets: [-1, -1, 1, 3, 3, 3] },
  'E7M':   { frets: [0, 2, 1, 1, 0, 0] },
  'F7M':   { frets: [-1, -1, 3, 2, 1, 0] },
  'F#7M':  { frets: [-1, -1, 4, 3, 2, 1] },
  'Gb7M':  { frets: [-1, -1, 4, 3, 2, 1] },
  'G7M':   { frets: [3, 2, 0, 0, 0, 2] },
  'G#7M':  { frets: [4, 6, 5, 5, 4, 4] },
  'Ab7M':  { frets: [4, 6, 5, 5, 4, 4] },
  'A7M':   { frets: [-1, 0, 2, 1, 2, 0] },
  'A#7M':  { frets: [-1, 1, 3, 2, 3, 1] },
  'Bb7M':  { frets: [-1, 1, 3, 2, 3, 1] },
  'B7M':   { frets: [-1, 2, 4, 3, 4, 2] },

  // ── Diminished ──
  'Cdim':  { frets: [-1, -1, 1, 2, 1, 2] },
  'C#dim': { frets: [-1, -1, 2, 3, 2, 3] },
  'Dbdim': { frets: [-1, -1, 2, 3, 2, 3] },
  'Ddim':  { frets: [-1, -1, 0, 1, 0, 1] },
  'D#dim': { frets: [-1, -1, 1, 2, 1, 2] },
  'Ebdim': { frets: [-1, -1, 1, 2, 1, 2] },
  'Edim':  { frets: [-1, -1, 2, 3, 2, 0] },
  'Fdim':  { frets: [-1, -1, 3, 4, 3, 1] },
  'F#dim': { frets: [-1, -1, 0, 1, 0, 2] },
  'Gbdim': { frets: [-1, -1, 0, 1, 0, 2] },
  'Gdim':  { frets: [-1, -1, 0, 2, 1, 3] },
  'G#dim': { frets: [-1, -1, 1, 2, 1, 3] },
  'Abdim': { frets: [-1, -1, 1, 2, 1, 3] },
  'Adim':  { frets: [-1, 0, 1, 2, 1, 2] },
  'A#dim': { frets: [-1, 1, 2, 3, 2, 3] },
  'Bbdim': { frets: [-1, 1, 2, 3, 2, 3] },
  'Bdim':  { frets: [-1, 2, 3, 4, 3, 2] },

  // ── Augmented ──
  'Caug':  { frets: [-1, 3, 2, 1, 1, 0] },
  'C+':    { frets: [-1, 3, 2, 1, 1, 0] },
  'Daug':  { frets: [-1, -1, 0, 3, 3, 2] },
  'D+':    { frets: [-1, -1, 0, 3, 3, 2] },
  'Eaug':  { frets: [0, 3, 2, 1, 1, 0] },
  'E+':    { frets: [0, 3, 2, 1, 1, 0] },
  'Faug':  { frets: [-1, -1, 3, 2, 2, 1] },
  'F+':    { frets: [-1, -1, 3, 2, 2, 1] },
  'Gaug':  { frets: [3, 2, 1, 0, 0, -1] },
  'G+':    { frets: [3, 2, 1, 0, 0, -1] },
  'Aaug':  { frets: [-1, 0, 3, 2, 2, 1] },
  'A+':    { frets: [-1, 0, 3, 2, 2, 1] },
  'Baug':  { frets: [-1, 2, 1, 0, 0, -1] },
  'B+':    { frets: [-1, 2, 1, 0, 0, -1] },

  // ── Suspended ──
  'Csus2': { frets: [-1, 3, 0, 0, 1, 3] },
  'Csus4': { frets: [-1, 3, 3, 0, 1, 1] },
  'Dsus2': { frets: [-1, -1, 0, 2, 3, 0] },
  'Dsus4': { frets: [-1, -1, 0, 2, 3, 3] },
  'Esus2': { frets: [0, 2, 4, 4, 0, 0] },
  'Esus4': { frets: [0, 2, 2, 2, 0, 0] },
  'Fsus2': { frets: [1, 1, 3, 3, 1, 1] },
  'Fsus4': { frets: [1, 3, 3, 3, 1, 1] },
  'Gsus2': { frets: [3, 0, 0, 0, 3, 3] },
  'Gsus4': { frets: [3, 3, 0, 0, 1, 1] },
  'Asus2': { frets: [-1, 0, 2, 2, 0, 0] },
  'Asus4': { frets: [-1, 0, 2, 2, 3, 0] },
  'Bsus2': { frets: [-1, 2, 4, 4, 2, 2] },
  'Bsus4': { frets: [-1, 2, 4, 4, 5, 2] },

  // ── 9th ──
  'C9':   { frets: [-1, 3, 2, 3, 3, 3] },
  'D9':   { frets: [-1, -1, 0, 2, 1, 0] },
  'E9':   { frets: [0, 2, 0, 1, 0, 2] },
  'G9':   { frets: [3, 2, 0, 2, 0, 1] },
  'A9':   { frets: [-1, 0, 2, 0, 2, 2] },
  'B9':   { frets: [-1, 2, 1, 2, 2, 2] },

  // ── 6th ──
  'C6':   { frets: [-1, 3, 2, 2, 1, 0] },
  'D6':   { frets: [-1, -1, 0, 2, 0, 2] },
  'E6':   { frets: [0, 2, 2, 1, 2, 0] },
  'G6':   { frets: [3, 2, 0, 0, 0, 0] },
  'A6':   { frets: [-1, 0, 2, 2, 2, 2] },
}

// ─── Custom voicings (localStorage) ──────────────────────────────────────────

const STORAGE_KEY = 'cifra_custom_voicings'

function loadCustomVoicings(): Record<string, ChordVoicing> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveCustomVoicings(map: Record<string, ChordVoicing>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch { /* ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the voicing for a chord (custom override first, then library). */
export function getVoicing(chordValue: string): ChordVoicing | null {
  const customs = loadCustomVoicings()
  return customs[chordValue] ?? LIBRARY[chordValue] ?? null
}

/** Persists a custom voicing for a chord name. */
export function setCustomVoicing(chordValue: string, voicing: ChordVoicing) {
  const customs = loadCustomVoicings()
  customs[chordValue] = voicing
  saveCustomVoicings(customs)
}

/** Removes a custom override, reverting to the library default. */
export function resetVoicing(chordValue: string) {
  const customs = loadCustomVoicings()
  delete customs[chordValue]
  saveCustomVoicings(customs)
}

/** Returns a fresh empty voicing (all open strings). */
export function emptyVoicing(): ChordVoicing {
  return { frets: [0, 0, 0, 0, 0, 0] }
}
