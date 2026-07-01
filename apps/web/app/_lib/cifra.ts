export type CifraChord = { value: string; position: number };
export type CifraLine = { text: string; chords: CifraChord[] };
export type CifraBlock = { type: string; lines: CifraLine[] };

type RawContent = {
  v?: number;
  blocks?: {
    type?: string;
    sections?: { lines?: { text?: string; chords?: { value?: string; position?: number }[] }[] }[];
  }[];
};

export function parseCifraContent(raw: string): CifraBlock[] {
  let data: RawContent;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }

  const blocks = data.blocks ?? [];
  return blocks
    .filter((b) => b.type !== 'header')
    .map((b) => ({
      type: b.type ?? 'unknown',
      lines: (b.sections ?? []).flatMap((s) =>
        (s.lines ?? []).map((l) => ({
          text: l.text ?? '',
          chords: (l.chords ?? [])
            .filter((c) => typeof c.value === 'string' && typeof c.position === 'number' && c.position >= 0)
            .map((c) => ({ value: c.value!, position: c.position! })),
        })),
      ),
    }));
}

export function chordRow(line: CifraLine): string {
  if (line.chords.length === 0) return '';
  const sorted = [...line.chords].sort((a, b) => a.position - b.position);
  let row = '';
  for (const c of sorted) {
    if (c.position < row.length) continue;
    row = row.padEnd(c.position, ' ') + c.value;
  }
  return row;
}
