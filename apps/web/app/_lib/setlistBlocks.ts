// Vocabulário dos blocos de setlist (repertoire_songs.item_type) — o setlist
// é um roteiro de show composto por blocos, estilo Notion. Fonte única usada
// pelo builder web e pela agenda pública.

export type BlockType =
  | 'song'
  | 'section'
  | 'talk'
  | 'interaction'
  | 'improv'
  | 'prayer'
  | 'reading'
  | 'media'
  | 'break'
  | 'technical';

export type BlockDef = {
  type: BlockType;
  label: string;
  hint: string;
  // classes de cor no padrão dos badges existentes (texto+fundo suaves)
  badgeClass: string;
  // bloco carrega campos musicais (tom/bpm) e busca no acervo
  isMusic: boolean;
};

export const BLOCK_TYPES: BlockDef[] = [
  { type: 'song', label: 'Música', hint: 'Do acervo, com tom e BPM', badgeClass: 'bg-[color-mix(in_oklch,var(--ml-accent)_15%,transparent)] text-accent', isMusic: true },
  { type: 'section', label: 'Seção', hint: 'Divisor: "Abertura", "Bloco acústico", "Bis"', badgeClass: 'bg-surface text-ink', isMusic: false },
  { type: 'talk', label: 'Fala / Recado', hint: 'Saudação, aviso, apresentação da banda', badgeClass: 'bg-amber-400/15 text-amber-400', isMusic: false },
  { type: 'interaction', label: 'Interação', hint: 'Chamada com o público, coro, palmas', badgeClass: 'bg-pink-400/15 text-pink-400', isMusic: false },
  { type: 'improv', label: 'Jam / Improviso', hint: 'Base livre, solo estendido', badgeClass: 'bg-purple-400/15 text-purple-400', isMusic: false },
  { type: 'prayer', label: 'Oração / Ministração', hint: 'Momento ministrado, apelo', badgeClass: 'bg-violet-400/15 text-violet-400', isMusic: false },
  { type: 'reading', label: 'Leitura', hint: 'Texto bíblico, poema, carta', badgeClass: 'bg-teal-400/15 text-teal-400', isMusic: false },
  { type: 'media', label: 'VT / Playback', hint: 'Vídeo, playback, abertura gravada', badgeClass: 'bg-cyan-400/15 text-cyan-400', isMusic: false },
  { type: 'break', label: 'Pausa', hint: 'Intervalo, troca de figurino', badgeClass: 'bg-surface text-muted', isMusic: false },
  { type: 'technical', label: 'Nota técnica', hint: 'Troca de instrumento, afinação, retorno', badgeClass: 'bg-blue-400/15 text-blue-400', isMusic: false },
];

const BY_TYPE = new Map(BLOCK_TYPES.map((b) => [b.type, b]));

export function blockDef(type: string | null | undefined): BlockDef {
  return BY_TYPE.get((type ?? 'song') as BlockType) ?? BY_TYPE.get('song')!;
}

export function isValidBlockType(type: unknown): type is BlockType {
  return typeof type === 'string' && BY_TYPE.has(type as BlockType);
}

export function formatDuration(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, '0')}`;
}
