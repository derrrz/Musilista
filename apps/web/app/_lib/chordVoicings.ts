// Guitar chord voicings — standard tuning (EADGBe, low → high)
// frets: [-1=muted, 0=open, N=fret number (absolute)]
// baseFret: lowest fret displayed (default 1, determines diagram window 1..4)
// barres: [{fret, from, to}] — from/to are string indices 0=low E, 5=high e

export type ChordVoicing = {
  frets: number[]
  baseFret?: number
  barres?: { fret: number; from: number; to: number }[]
}

const V: Record<string, ChordVoicing> = {
  // ── A ──────────────────────────────────────────────────────────────────────
  'A':     { frets: [-1, 0, 2, 2, 2, 0] },
  'Am':    { frets: [-1, 0, 2, 2, 1, 0] },
  'A7':    { frets: [-1, 0, 2, 0, 2, 0] },
  'Am7':   { frets: [-1, 0, 2, 0, 1, 0] },
  'Amaj7': { frets: [-1, 0, 2, 1, 2, 0] },
  'Asus2': { frets: [-1, 0, 2, 2, 0, 0] },
  'Asus4': { frets: [-1, 0, 2, 2, 3, 0] },
  'A5':    { frets: [-1, 0, 2, 2, -1, -1] },

  // ── B ──────────────────────────────────────────────────────────────────────
  'B7':    { frets: [-1, 2, 1, 2, 0, 2] },
  'Bm':    { frets: [-1, 2, 4, 4, 3, 2], baseFret: 2, barres: [{ fret: 2, from: 1, to: 5 }] },
  'Bm7':   { frets: [-1, 2, 4, 2, 3, 2], baseFret: 2 },

  // ── Bb / A# ────────────────────────────────────────────────────────────────
  'Bb':    { frets: [-1, 1, 3, 3, 3, 1], barres: [{ fret: 1, from: 1, to: 5 }] },
  'A#':    { frets: [-1, 1, 3, 3, 3, 1], barres: [{ fret: 1, from: 1, to: 5 }] },
  'Bbm':   { frets: [-1, 1, 3, 3, 2, 1], barres: [{ fret: 1, from: 1, to: 5 }] },
  'A#m':   { frets: [-1, 1, 3, 3, 2, 1], barres: [{ fret: 1, from: 1, to: 5 }] },
  'Bb7':   { frets: [-1, 1, 3, 1, 3, 1], barres: [{ fret: 1, from: 1, to: 5 }] },
  'Bbmaj7':{ frets: [-1, 1, 3, 2, 3, 1], barres: [{ fret: 1, from: 1, to: 5 }] },

  // ── C ──────────────────────────────────────────────────────────────────────
  'C':     { frets: [-1, 3, 2, 0, 1, 0] },
  'Cm':    { frets: [-1, 3, 5, 5, 4, 3], baseFret: 3, barres: [{ fret: 3, from: 1, to: 5 }] },
  'C7':    { frets: [-1, 3, 2, 3, 1, 0] },
  'Cm7':   { frets: [-1, 3, 5, 3, 4, 3], baseFret: 3, barres: [{ fret: 3, from: 1, to: 5 }] },
  'Cmaj7': { frets: [-1, 3, 2, 0, 0, 0] },
  'Cadd9': { frets: [-1, 3, 2, 0, 3, 0] },
  'C/E':   { frets: [0, 3, 2, 0, 1, 0] },
  'C/G':   { frets: [3, 3, 2, 0, 1, 0] },

  // ── C# / Db ────────────────────────────────────────────────────────────────
  'C#':    { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4, barres: [{ fret: 4, from: 1, to: 5 }] },
  'Db':    { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4, barres: [{ fret: 4, from: 1, to: 5 }] },
  'C#m':   { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4, barres: [{ fret: 4, from: 1, to: 5 }] },
  'Dbm':   { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4, barres: [{ fret: 4, from: 1, to: 5 }] },
  'C#7':   { frets: [-1, 4, 3, 4, 2, 4], baseFret: 2 },

  // ── D ──────────────────────────────────────────────────────────────────────
  'D':     { frets: [-1, -1, 0, 2, 3, 2] },
  'Dm':    { frets: [-1, -1, 0, 2, 3, 1] },
  'D7':    { frets: [-1, -1, 0, 2, 1, 2] },
  'Dm7':   { frets: [-1, -1, 0, 2, 1, 1] },
  'Dmaj7': { frets: [-1, -1, 0, 2, 2, 2] },
  'Dsus2': { frets: [-1, -1, 0, 2, 3, 0] },
  'Dsus4': { frets: [-1, -1, 0, 2, 3, 3] },
  'D/F#':  { frets: [2, -1, 0, 2, 3, 2] },

  // ── D# / Eb ────────────────────────────────────────────────────────────────
  'Eb':    { frets: [-1, -1, 1, 3, 4, 3], baseFret: 1 },
  'D#':    { frets: [-1, -1, 1, 3, 4, 3], baseFret: 1 },
  'Ebm':   { frets: [-1, -1, 1, 3, 4, 2], baseFret: 1 },
  'D#m':   { frets: [-1, -1, 1, 3, 4, 2], baseFret: 1 },
  'Eb7':   { frets: [-1, -1, 1, 3, 2, 3], baseFret: 1 },

  // ── E ──────────────────────────────────────────────────────────────────────
  'E':     { frets: [0, 2, 2, 1, 0, 0] },
  'Em':    { frets: [0, 2, 2, 0, 0, 0] },
  'E7':    { frets: [0, 2, 0, 1, 0, 0] },
  'Em7':   { frets: [0, 2, 2, 0, 3, 0] },
  'Emaj7': { frets: [0, 2, 1, 1, 0, 0] },
  'E7sus4':{ frets: [0, 2, 0, 2, 0, 0] },

  // ── F ──────────────────────────────────────────────────────────────────────
  'F':     { frets: [1, 3, 3, 2, 1, 1], barres: [{ fret: 1, from: 0, to: 5 }] },
  'Fm':    { frets: [1, 3, 3, 1, 1, 1], barres: [{ fret: 1, from: 0, to: 5 }] },
  'F7':    { frets: [1, 3, 1, 2, 1, 1], barres: [{ fret: 1, from: 0, to: 5 }] },
  'Fm7':   { frets: [1, 3, 3, 1, 1, 1], barres: [{ fret: 1, from: 0, to: 5 }] },
  'Fmaj7': { frets: [-1, -1, 3, 2, 1, 0] },

  // ── F# / Gb ────────────────────────────────────────────────────────────────
  'F#':    { frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barres: [{ fret: 2, from: 0, to: 5 }] },
  'Gb':    { frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barres: [{ fret: 2, from: 0, to: 5 }] },
  'F#m':   { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barres: [{ fret: 2, from: 0, to: 5 }] },
  'Gbm':   { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barres: [{ fret: 2, from: 0, to: 5 }] },
  'F#7':   { frets: [2, 4, 2, 3, 2, 2], baseFret: 2, barres: [{ fret: 2, from: 0, to: 5 }] },
  'F#m7':  { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barres: [{ fret: 2, from: 0, to: 5 }] },

  // ── G ──────────────────────────────────────────────────────────────────────
  'G':     { frets: [3, 2, 0, 0, 0, 3] },
  'Gm':    { frets: [3, 5, 5, 3, 3, 3], baseFret: 3, barres: [{ fret: 3, from: 0, to: 5 }] },
  'G7':    { frets: [3, 2, 0, 0, 0, 1] },
  'Gm7':   { frets: [3, 5, 3, 3, 3, 3], baseFret: 3, barres: [{ fret: 3, from: 0, to: 5 }] },
  'Gmaj7': { frets: [3, 2, 0, 0, 0, 2] },
  'Gsus4': { frets: [3, 3, 0, 0, 1, 3] },
  'G/B':   { frets: [-1, 2, 0, 0, 0, 3] },

  // ── G# / Ab ────────────────────────────────────────────────────────────────
  'Ab':    { frets: [4, 6, 6, 5, 4, 4], baseFret: 4, barres: [{ fret: 4, from: 0, to: 5 }] },
  'G#':    { frets: [4, 6, 6, 5, 4, 4], baseFret: 4, barres: [{ fret: 4, from: 0, to: 5 }] },
  'Abm':   { frets: [4, 6, 6, 4, 4, 4], baseFret: 4, barres: [{ fret: 4, from: 0, to: 5 }] },
  'G#m':   { frets: [4, 6, 6, 4, 4, 4], baseFret: 4, barres: [{ fret: 4, from: 0, to: 5 }] },
  'Ab7':   { frets: [4, 6, 4, 5, 4, 4], baseFret: 4, barres: [{ fret: 4, from: 0, to: 5 }] },
}

// ── Lookup ────────────────────────────────────────────────────────────────────

export function getVoicing(chord: string): ChordVoicing | null {
  if (!chord) return null

  // Exact match
  if (V[chord]) return V[chord]

  // Strip whitespace and try again
  const clean = chord.trim()
  if (V[clean]) return V[clean]

  // Slash chord: try base
  const slash = clean.indexOf('/')
  if (slash > 0) {
    const base = clean.slice(0, slash)
    if (V[base]) return V[base]
  }

  // Common notation aliases
  const aliases: Record<string, string> = {
    'min': 'm', 'maj': 'maj', 'M7': 'maj7',
  }
  for (const [from, to] of Object.entries(aliases)) {
    const repl = clean.replace(from, to)
    if (V[repl]) return V[repl]
  }

  return null
}
