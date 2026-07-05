import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { and, asc, eq } from 'drizzle-orm';

type Params = { artistSlug: string };

// Só versões principais — as variantes aparecem dentro da página da música.
const loadArtist = cache(async (artistSlug: string) =>
  db
    .select({
      title: importedSongs.title,
      artist: importedSongs.artist,
      titleSlug: importedSongs.titleSlug,
      songKey: importedSongs.songKey,
    })
    .from(importedSongs)
    .where(and(eq(importedSongs.artistSlug, artistSlug), eq(importedSongs.versionSlug, '')))
    .orderBy(asc(importedSongs.titleSlug)),
);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { artistSlug } = await params;
  const songs = await loadArtist(artistSlug);
  if (songs.length === 0) return {};
  const artist = songs[0].artist;
  return {
    title: `Cifras de ${artist}`,
    description: `${songs.length} cifras de ${artist} com acordes, tom e transposição: ${songs
      .slice(0, 3)
      .map((s) => s.title)
      .join(', ')} e mais.`.slice(0, 160),
    alternates: { canonical: `/${artistSlug}` },
    openGraph: {
      title: `Cifras de ${artist} | Musilista`,
      url: `/${artistSlug}`,
      siteName: 'Musilista',
      locale: 'pt_BR',
      images: [`/api/artist-photo?name=${encodeURIComponent(artist)}`],
    },
  };
}

export default async function ArtistPage({ params }: { params: Promise<Params> }) {
  const { artistSlug } = await params;
  const songs = await loadArtist(artistSlug);
  if (songs.length === 0) notFound();
  const artist = songs[0].artist;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist,
    url: `https://www.musilista.com.br/${artistSlug}`,
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/artist-photo?name=${encodeURIComponent(artist)}`}
          alt={artist}
          className="h-16 w-16 rounded-full border border-line object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold text-ink">{artist}</h1>
          <p className="text-sm text-muted">
            {songs.length} {songs.length === 1 ? 'cifra' : 'cifras'}
          </p>
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-raised">
        {songs.map((s) => (
          <li key={s.titleSlug}>
            <Link
              href={`/${artistSlug}/${s.titleSlug}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface"
            >
              <span className="truncate text-sm font-medium text-ink">{s.title}</span>
              {s.songKey && <span className="shrink-0 font-mono text-xs text-accent">{s.songKey}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
