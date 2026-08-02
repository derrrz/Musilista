// Versão compacta da nuvem de palavras do CapabilityMap, escopada a um único
// setlist (não o grupo inteiro) — sem legenda, fonte menor, pensada pra
// caber dentro de um card.
type SongStyle = { genero: string | null; estilos: string[] | null };

function aggregate(songs: SongStyle[]): { label: string; category: 'genero' | 'estilo'; count: number }[] {
  const tally = new Map<string, { label: string; category: 'genero' | 'estilo'; count: number }>();
  const add = (label: string, category: 'genero' | 'estilo') => {
    const key = `${category}|${label.toLowerCase()}`;
    const cur = tally.get(key);
    if (cur) cur.count++;
    else tally.set(key, { label, category, count: 1 });
  };
  for (const s of songs) {
    if (s.genero) add(s.genero, 'genero');
    for (const e of s.estilos ?? []) add(e, 'estilo');
  }
  return [...tally.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 16);
}

const CATEGORY_CLASS: Record<'genero' | 'estilo', string> = {
  genero: 'text-rose-400',
  estilo: 'text-cyan-400',
};

export function StyleCloud({ songs }: { songs: SongStyle[] }) {
  const items = aggregate(songs);
  if (items.length === 0) {
    return <p className="text-[11px] text-faint">Sem gênero/estilo classificado ainda</p>;
  }

  const maxCount = Math.max(...items.map((i) => i.count));

  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      {items.map((i) => {
        const scale = maxCount > 1 ? (i.count - 1) / (maxCount - 1) : 0;
        const fontSize = Math.round(10 + scale * 6);
        return (
          <span
            key={`${i.category}|${i.label}`}
            title={`${i.label} — ${i.count} ${i.count === 1 ? 'música' : 'músicas'}`}
            className={`${CATEGORY_CLASS[i.category]} font-medium leading-tight`}
            style={{ fontSize, opacity: 0.65 + scale * 0.35 }}
          >
            {i.label}
          </span>
        );
      })}
    </div>
  );
}
