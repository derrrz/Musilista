import type { Line, Section } from '@/types';

// Espelho do parser da web (app/_lib/cifra.ts): o content de uma música do
// acervo é um JSON { v, blocks: [{ type, sections: [{ lines }] }] }
interface RawChord {
  value?: string;
  position?: number;
}

interface RawLine {
  text?: string;
  chords?: RawChord[];
}

interface RawContent {
  v?: number;
  blocks?: {
    type?: string;
    name?: string;
    sections?: { lines?: RawLine[] }[];
  }[];
}

// Monta a linha de acordes posicionando cada acorde na coluna original
// (as telas usam fonte mono, então o alinhamento com a letra se preserva)
function buildChordLine(chords: { value: string; position: number }[]): string {
  let out = '';
  const sorted = [...chords].sort((a, b) => a.position - b.position);
  for (const chord of sorted) {
    if (chord.position < out.length) continue;
    out = out.padEnd(chord.position, ' ') + chord.value;
  }
  return out;
}

const BLOCK_LABELS: Record<string, string> = {
  intro: 'Intro',
  verse: 'Verso',
  chorus: 'Refrão',
  bridge: 'Ponte',
  solo: 'Solo',
};

export function parseCifraContent(raw: string): Section[] {
  let data: RawContent;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  const sections: Section[] = [];
  for (const block of data.blocks ?? []) {
    if (block.type === 'header') continue;
    const lines: Line[] = [];
    for (const section of block.sections ?? []) {
      for (const line of section.lines ?? []) {
        const chords = (line.chords ?? []).filter(
          (c): c is { value: string; position: number } =>
            typeof c.value === 'string' && typeof c.position === 'number' && c.position >= 0,
        );
        const chord = chords.length ? buildChordLine(chords) : undefined;
        const lyric = line.text || undefined;
        if (chord || lyric) lines.push({ chord, lyric });
      }
    }
    if (lines.length > 0) {
      sections.push({
        label: block.name ?? BLOCK_LABELS[block.type ?? ''] ?? block.type ?? '',
        active: false,
        lines,
      });
    }
  }
  return sections;
}
