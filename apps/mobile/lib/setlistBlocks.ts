import { colors } from '@/constants/colors';

// Vocabulário dos blocos de setlist (repertoire_songs.item_type) — espelho de
// apps/web/app/_lib/setlistBlocks.ts. O setlist é um roteiro de show composto
// por blocos, estilo Notion. Manter em sincronia com a web.

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
  badge: { bg: string; text: string };
  isMusic: boolean;
};

export const BLOCK_TYPES: BlockDef[] = [
  { type: 'song', label: 'Música', hint: 'Do acervo, com tom e BPM', badge: { bg: colors.accentTint15, text: colors.accent }, isMusic: true },
  { type: 'section', label: 'Seção', hint: 'Divisor: "Abertura", "Bloco acústico", "Bis"', badge: { bg: colors.surface, text: colors.ink }, isMusic: false },
  { type: 'talk', label: 'Fala / Recado', hint: 'Saudação, aviso, apresentação da banda', badge: { bg: 'rgba(251,191,36,0.15)', text: colors.amber400 }, isMusic: false },
  { type: 'interaction', label: 'Interação', hint: 'Chamada com o público, coro, palmas', badge: { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' }, isMusic: false },
  { type: 'improv', label: 'Jam / Improviso', hint: 'Base livre, solo estendido', badge: { bg: 'rgba(192,132,252,0.15)', text: '#c084fc' }, isMusic: false },
  { type: 'prayer', label: 'Oração / Ministração', hint: 'Momento ministrado, apelo', badge: { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' }, isMusic: false },
  { type: 'reading', label: 'Leitura', hint: 'Texto bíblico, poema, carta', badge: { bg: 'rgba(45,212,191,0.15)', text: '#2dd4bf' }, isMusic: false },
  { type: 'media', label: 'VT / Playback', hint: 'Vídeo, playback, abertura gravada', badge: { bg: 'rgba(34,211,238,0.15)', text: '#22d3ee' }, isMusic: false },
  { type: 'break', label: 'Pausa', hint: 'Intervalo, troca de figurino', badge: { bg: colors.surface, text: colors.muted }, isMusic: false },
  { type: 'technical', label: 'Nota técnica', hint: 'Troca de instrumento, afinação, retorno', badge: { bg: colors.blueTint15, text: colors.blue400 }, isMusic: false },
];

const BY_TYPE = new Map(BLOCK_TYPES.map((b) => [b.type, b]));

export function blockDef(type: string | null | undefined): BlockDef {
  return BY_TYPE.get((type ?? 'song') as BlockType) ?? BY_TYPE.get('song')!;
}

export function formatDuration(totalSec: number): string {
  const min = Math.round(totalSec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, '0')}`;
}
