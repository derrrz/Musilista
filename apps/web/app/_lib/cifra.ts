import { parseCifraText } from './cifraParser/plainText';

export type CifraChord = { value: string; position: number };
export type CifraLine = { text: string; chords: CifraChord[] };
export type CifraBlock = { type: string; lines: CifraLine[] };

type RawContent = {
  v?: number;
  blocks?: {
    type?: string;
    capo?: number;
    tuning?: string;
    sections?: { lines?: { text?: string; chords?: { value?: string; position?: number }[] }[] }[];
  }[];
};

export type CifraHeaderMeta = { capo?: number; tuning?: string };

function parseRawContent(raw: string): RawContent | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function parseCifraContent(raw: string): CifraBlock[] {
  const data = parseRawContent(raw);
  if (!data) return [];

  const blocks = Array.isArray(data.blocks) ? data.blocks : [];
  return blocks
    .filter((b) => b.type !== 'header')
    .map((b) => ({
      type: b.type ?? 'unknown',
      lines: (Array.isArray(b.sections) ? b.sections : []).flatMap((s) =>
        (Array.isArray(s.lines) ? s.lines : []).map((l) => ({
          text: l.text ?? '',
          chords: (Array.isArray(l.chords) ? l.chords : [])
            .filter((c) => typeof c.value === 'string' && typeof c.position === 'number' && c.position >= 0)
            .map((c) => ({ value: c.value!, position: c.position! })),
        })),
      ),
    }));
}

// Capo/afinação vivem só no bloco header, que parseCifraContent descarta —
// tom (songKey) já vem de uma coluna separada em importedSongs, mas
// capo/afinação só existem dentro do content, então precisam ser extraídos
// à parte pra aparecer no visualizador.
export function parseCifraHeaderMeta(raw: string): CifraHeaderMeta {
  const data = parseRawContent(raw);
  if (!data) return {};
  const header = (Array.isArray(data.blocks) ? data.blocks : []).find((b) => b.type === 'header');
  if (!header) return {};
  return {
    capo: typeof header.capo === 'number' && header.capo >= 1 && header.capo <= 12 ? header.capo : undefined,
    tuning: typeof header.tuning === 'string' && header.tuning.trim() ? header.tuning.trim() : undefined,
  };
}

// O acervo novo guarda o TXT canônico ("Colar Cifra") em content; linhas
// antigas guardavam JSON de blocks. O check por '{' mantém os dois formatos
// funcionando durante o cutover (deploy antes/depois do upload).
export type StoredCifra = {
  blocks: CifraBlock[];
  capo?: number;
  tuning?: string;
  songKey?: string;
};

export function parseStoredContent(raw: string): StoredCifra {
  if (raw.trimStart().startsWith('{')) {
    return { blocks: parseCifraContent(raw), ...parseCifraHeaderMeta(raw) };
  }
  const { blocks } = parseCifraText(raw);
  const header = blocks.find((b) => b.type === 'header');
  return {
    blocks: blocks
      .filter((b) => b.type !== 'header')
      .map((b) => ({
        type: b.type,
        lines: b.sections.flatMap((s) =>
          s.lines.map((l) => ({
            text: l.text,
            chords: l.chords.map((c) => ({ value: c.value, position: c.position })),
          })),
        ),
      })),
    capo: header?.capo,
    tuning: header?.tuning,
    songKey: header?.songKey,
  };
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
