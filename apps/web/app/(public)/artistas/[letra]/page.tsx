import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { asc, eq, sql } from 'drizzle-orm';

type Params = { letra: string };

const VALID = new Set(['0-9', ...'abcdefghijklmnopqrstuvwxyz'.split('')]);

async function loadLetter(letra: string) {
  return db
    .select({
      artist: importedSongs.artist,
      artistSlug: importedSongs.artistSlug,
      count: sql<number>`count(*) filter (where ${importedSongs.versionSlug} = '')::int`,
    })
    .from(importedSongs)
    .where(eq(importedSongs.letter, letra))
    .groupBy(importedSongs.artist, importedSongs.artistSlug)
    .orderBy(asc(importedSongs.artistSlug));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { letra } = await params;
  const label = letra === '0-9' ? '0–9' : letra.toUpperCase();
  return {
    title: `Artistas com ${label}`,
    description: `Artistas com nome começando em ${label} no acervo de cifras do Musilista.`,
    alternates: { canonical: `/artistas/${letra}` },
  };
}

export default async function LetraPage({ params }: { params: Promise<Params> }) {
  const { letra } = await params;
  if (!VALID.has(letra)) notFound();
  const artists = await loadLetter(letra);
  if (artists.length === 0) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">
          Artistas — {letra === '0-9' ? '0–9' : letra.toUpperCase()}
        </h1>
        <p className="text-sm text-muted">
          {artists.length} {artists.length === 1 ? 'artista' : 'artistas'} ·{' '}
          <Link href="/artistas" className="text-accent hover:underline">
            todas as letras
          </Link>
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-raised">
        {artists.map((a) => (
          <li key={a.artistSlug}>
            <Link
              href={`/${a.artistSlug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface"
            >
              <span className="truncate text-sm font-medium text-ink">{a.artist}</span>
              <span className="shrink-0 text-xs text-muted">{a.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
