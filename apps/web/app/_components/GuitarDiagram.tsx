import { getVoicing } from '../_lib/chordVoicings'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAD_X    = 5    // left/right padding inside SVG (right gets extra for label)
const PAD_TOP  = 13   // space above nut for open/muted markers
const PAD_BOT  = 4
const STR_GAP  = 8    // horizontal gap between strings
const FRET_GAP = 11   // vertical gap between fret lines
const N_STR    = 6
const N_FRETS  = 4
const DOT_R    = 3.2  // finger dot radius
const OPEN_R   = 2.8  // open-string circle radius
const CROSS_H  = 2.5  // half-arm length of × mark

// Derived dimensions
const GRID_W = (N_STR - 1) * STR_GAP               // 40px
const GRID_H = N_FRETS * FRET_GAP                  // 44px
const SVG_W  = PAD_X + GRID_W + PAD_X + 14         // 64px (14 for baseFret label)
const SVG_H  = PAD_TOP + GRID_H + PAD_BOT           // 61px

// x-coordinate for string i (0 = low E, 5 = high e)
const strX = (i: number) => PAD_X + i * STR_GAP
// y-coordinate for the TOP of fret-row F (absolute fret, baseFret=context)
const fretY = (absF: number, baseFret: number) =>
  PAD_TOP + (absF - baseFret) * FRET_GAP + FRET_GAP / 2

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuitarDiagram({ chord }: { chord: string }) {
  const voicing = getVoicing(chord)

  if (!voicing) {
    // Unknown chord: minimal placeholder
    return (
      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block', opacity: 0.25 }}>
        <text x={SVG_W / 2} y={SVG_H / 2 + 4} textAnchor="middle"
          fontSize={9} fill="#888" fontFamily="system-ui, sans-serif">?</text>
      </svg>
    )
  }

  const { frets, barres = [], baseFret = 1 } = voicing
  const nutY    = PAD_TOP
  const isNut   = baseFret === 1
  const showLbl = baseFret > 1

  return (
    <svg
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={`Diagrama de ${chord}`}
    >
      {/* ── Fret lines ── */}
      {Array.from({ length: N_FRETS + 1 }, (_, j) => {
        const y = nutY + j * FRET_GAP
        const isNutLine = j === 0 && isNut
        return (
          <line
            key={j}
            x1={PAD_X} y1={y}
            x2={PAD_X + GRID_W} y2={y}
            stroke={isNutLine ? '#1a1a1a' : '#aaa'}
            strokeWidth={isNutLine ? 3 : 0.9}
            strokeLinecap="round"
          />
        )
      })}

      {/* ── Non-nut top border (when baseFret > 1) ── */}
      {!isNut && (
        <line
          x1={PAD_X} y1={nutY}
          x2={PAD_X + GRID_W} y2={nutY}
          stroke="#aaa" strokeWidth={0.9}
        />
      )}

      {/* ── String lines ── */}
      {Array.from({ length: N_STR }, (_, i) => (
        <line
          key={i}
          x1={strX(i)} y1={nutY}
          x2={strX(i)} y2={nutY + GRID_H}
          stroke="#aaa" strokeWidth={0.9}
        />
      ))}

      {/* ── Barres ── */}
      {barres.map((b, bi) => {
        const y  = fretY(b.fret, baseFret)
        const x1 = strX(b.from) - DOT_R
        const x2 = strX(b.to)   + DOT_R
        return (
          <rect
            key={bi}
            x={x1} y={y - DOT_R}
            width={x2 - x1} height={DOT_R * 2}
            rx={DOT_R}
            fill="#222"
          />
        )
      })}

      {/* ── Finger dots ── */}
      {frets.map((f, i) => {
        if (f <= 0) return null   // open or muted handled separately
        // skip if covered by a barre on this exact fret
        const isBarre = barres.some(b => b.fret === f && i >= b.from && i <= b.to)
        if (isBarre) return null
        const y = fretY(f, baseFret)
        return (
          <circle key={i} cx={strX(i)} cy={y} r={DOT_R} fill="#222" />
        )
      })}

      {/* ── Open / muted markers above nut ── */}
      {frets.map((f, i) => {
        if (f > 0) return null
        const cx = strX(i)
        const cy = PAD_TOP - 7
        if (f === 0) {
          return (
            <circle
              key={i} cx={cx} cy={cy} r={OPEN_R}
              fill="none" stroke="#555" strokeWidth={1}
            />
          )
        }
        // Muted (f === -1): ×
        const d = CROSS_H
        return (
          <g key={i}>
            <line x1={cx - d} y1={cy - d} x2={cx + d} y2={cy + d}
              stroke="#666" strokeWidth={1.2} strokeLinecap="round" />
            <line x1={cx + d} y1={cy - d} x2={cx - d} y2={cy + d}
              stroke="#666" strokeWidth={1.2} strokeLinecap="round" />
          </g>
        )
      })}

      {/* ── BaseFret label ── */}
      {showLbl && (
        <text
          x={PAD_X + GRID_W + 5}
          y={nutY + FRET_GAP * 0.7}
          fontSize={8}
          fontFamily="system-ui, sans-serif"
          fill="#777"
          dominantBaseline="middle"
        >
          {baseFret}fr
        </text>
      )}
    </svg>
  )
}
