import Link from 'next/link';
import type { Capability } from './types';

const CATEGORY_STYLE: Record<Capability['category'], { className: string; legend: string }> = {
  function: { className: 'text-accent', legend: 'Funções' },
  instrument: { className: 'text-blue-400', legend: 'Instrumentos' },
  competency: { className: 'text-amber-400', legend: 'Competências' },
};

// Nuvem de palavras das capacidades do grupo: quanto mais membros declaram
// uma função/instrumento/competência no perfil, maior a palavra.
export function CapabilityMap({ capabilities }: { capabilities: Capability[] }) {
  if (capabilities.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
        <p className="text-sm text-muted">
          O mapa do grupo nasce dos perfis dos membros — instrumentos, funções e competências.
        </p>
        <p className="mt-1 text-xs text-faint">
          Peça para cada um preencher o{' '}
          <Link href="/profile" className="text-accent underline underline-offset-2">
            perfil
          </Link>{' '}
          e volte aqui.
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...capabilities.map((c) => c.count));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface/60 p-6">
      <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2">
        {capabilities.map((c) => {
          const scale = maxCount > 1 ? (c.count - 1) / (maxCount - 1) : 0;
          const fontSize = Math.round(13 + scale * 21);
          return (
            <span
              key={`${c.category}|${c.label}`}
              title={`${c.label} — ${c.count} ${c.count === 1 ? 'membro' : 'membros'}`}
              className={`${CATEGORY_STYLE[c.category].className} font-semibold leading-tight`}
              style={{ fontSize, opacity: 0.6 + scale * 0.4 }}
            >
              {c.label}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-line pt-3">
        {(Object.keys(CATEGORY_STYLE) as Capability['category'][]).map((cat) => (
          <span key={cat} className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-faint">
            <span className={`h-1.5 w-1.5 rounded-full bg-current ${CATEGORY_STYLE[cat].className}`} />
            {CATEGORY_STYLE[cat].legend}
          </span>
        ))}
      </div>
    </div>
  );
}
