// Normalizes BPM to 60–150 range by halving/doubling to correct tempo-octave errors
// (e.g. Deezer/Spotify often return 176 when the true tempo is 88).
export function normalizeBpm(bpm: number): number {
  let b = bpm
  while (b > 150) b = Math.round(b / 2)
  while (b < 60)  b = Math.round(b * 2)
  return b
}

// Client-side time signature detection using Web Audio API + Deezer 30s preview.
// Strategy: sample RMS energy at beat positions (using known BPM), then score
// candidate groupings (3, 4, 6) by how much stronger the downbeat is vs offbeats.

export async function detectTimeSignature(previewUrl: string, bpm: number): Promise<number | null> {
  try {
    const res = await fetch(`/api/deezer/preview?url=${encodeURIComponent(previewUrl)}`)
    if (!res.ok) return null

    const arrayBuffer = await res.arrayBuffer()
    const AudioCtx = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null

    const ctx = new AudioCtx()
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    await ctx.close()

    return analyzeTimeSignature(audioBuffer, bpm)
  } catch {
    return null
  }
}

function analyzeTimeSignature(buffer: AudioBuffer, bpm: number): number {
  const samples = buffer.getChannelData(0)
  const sr = buffer.sampleRate

  // 10ms frames → 100 frames/s
  const frameLen = Math.round(sr / 100)
  const numFrames = Math.floor(samples.length / frameLen)

  // RMS energy per frame
  const energy = new Float32Array(numFrames)
  for (let f = 0; f < numFrames; f++) {
    const start = f * frameLen
    let sum = 0
    for (let i = start; i < start + frameLen && i < samples.length; i++) {
      sum += samples[i] * samples[i]
    }
    energy[f] = Math.sqrt(sum / frameLen)
  }

  // Beat period in frames
  const beatFrames = (60 / bpm) * 100

  // Find best phase by maximizing total energy at beat grid positions
  let bestPhase = 0
  let bestScore = -1
  const halfStep = 0.5
  const steps = Math.ceil(beatFrames / halfStep)
  for (let step = 0; step < steps; step++) {
    const phase = step * halfStep
    let score = 0
    for (let b = 0; b * beatFrames + phase < numFrames; b++) {
      const idx = Math.round(b * beatFrames + phase)
      if (idx < numFrames) score += energy[idx]
    }
    if (score > bestScore) { bestScore = score; bestPhase = phase }
  }

  // Extract energy at each beat
  const beats: number[] = []
  for (let b = 0; b * beatFrames + bestPhase < numFrames; b++) {
    const idx = Math.round(b * beatFrames + bestPhase)
    if (idx < numFrames) beats.push(energy[idx])
  }

  if (beats.length < 8) return 4 // não há dados suficientes

  // Score cada candidato com contraste normalizado: (downAvg - offAvg) / (downAvg + offAvg).
  // Essa métrica é simétrica e não tem o viés estrutural da ratio pura (downAvg/offAvg),
  // que favorecia artificialmente n=3 por ter proporcionalmente mais downbeats (1:2) que n=4 (1:3).
  const candidates = [3, 4, 6]
  const scores: Record<number, number> = {}

  for (const n of candidates) {
    let downSum = 0, offSum = 0, downCount = 0, offCount = 0
    beats.forEach((e, i) => {
      if (i % n === 0) { downSum += e; downCount++ }
      else             { offSum  += e; offCount++  }
    })
    const downAvg = downSum / (downCount || 1)
    const offAvg  = offSum  / (offCount  || 1)
    scores[n] = (downAvg - offAvg) / (downAvg + offAvg + 1e-9)
  }

  // 4/4 é o padrão. 3/4 só vence se seu score for ≥ 50% maior que o do 4/4.
  // Errar para 4/4 é muito menos prejudicial do que errar para 3/4.
  if (scores[3] > scores[4] * 1.50) return 3
  return 4
}
