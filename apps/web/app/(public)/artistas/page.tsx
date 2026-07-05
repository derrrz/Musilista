import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Artistas de A a Z',
  description: 'Navegue por todos os artistas do acervo de cifras do Musilista, organizados de A a Z.',
  alternates: { canonical: '/artistas' },
};

const LETTERS = ['0-9', ...'abcdefghijklmnopqrstuvwxyz'.split('')];

export default function ArtistasIndexPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Artistas</h1>
        <p className="text-sm text-muted">Todo o acervo, de A a Z.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {LETTERS.map((l) => (
          <Link
            key={l}
            href={`/artistas/${l}`}
            className="flex h-10 min-w-10 items-center justify-center rounded-lg border border-line bg-raised px-3 font-mono text-sm font-semibold uppercase text-ink transition-colors hover:border-accent hover:text-accent"
          >
            {l}
          </Link>
        ))}
      </div>
    </div>
  );
}
