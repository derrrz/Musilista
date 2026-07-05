import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { importedSongs, userImportedSongs } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { parseStoredContent } from '@/app/_lib/cifra';
import { SongViewer, type SongVersionLink } from './SongViewer';

type Params = { artistSlug: string; songSlug: string };
type SearchParams = { versao?: string };

// Uma query traz o grupo inteiro (todas as versões do mesmo artista+título);
// cache() compartilha o resultado entre generateMetadata e a página.
const loadGroup = cache(async (artistSlug: string, songSlug: string) =>
  db
    .select({
      id: importedSongs.id,
      title: importedSongs.title,
      artist: importedSongs.artist,
      songKey: importedSongs.songKey,
      content: importedSongs.content,
      versionLabel: importedSongs.versionLabel,
      versionSlug: importedSongs.versionSlug,
    })
    .from(importedSongs)
    .where(and(eq(importedSongs.artistSlug, artistSlug), eq(importedSongs.titleSlug, songSlug)))
    .orderBy(importedSongs.versionSlug),
);

function pickVersion<T extends { versionSlug: string }>(group: T[], versao?: string): T | undefined {
  if (versao) return group.find((v) => v.versionSlug === versao);
  return group.find((v) => v.versionSlug === '') ?? group[0];
}

// Primeiras linhas de letra para a description — pula acordes e marcadores.
function descriptionFrom(blocks: ReturnType<typeof parseStoredContent>['blocks']): string {
  const lines: string[] = [];
  for (const b of blocks) {
    for (const l of b.lines) {
      const t = l.text.trim();
      if (t && l.chords.length === 0 && t.length > 8) lines.push(t);
      if (lines.length >= 2) break;
    }
    if (lines.length >= 2) break;
  }
  return lines.join(' ');
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { artistSlug, songSlug } = await params;
  const { versao } = await searchParams;
  const group = await loadGroup(artistSlug, songSlug);
  const song = pickVersion(group, versao);
  if (!song) return {};

  const { blocks, songKey } = parseStoredContent(song.content);
  const tom = song.songKey ?? songKey;
  const intro = descriptionFrom(blocks);
  const canonical = `/${artistSlug}/${songSlug}`;

  return {
    title: `${song.title} - ${song.artist} (Cifra)`,
    description:
      `Cifra de ${song.title} de ${song.artist}${tom ? ` — Tom: ${tom}` : ''}. ${intro}`.slice(0, 160),
    alternates: { canonical },
    openGraph: {
      title: `${song.title} - ${song.artist} (Cifra)`,
      description: `Cifra completa de ${song.title} — ${song.artist} no Musilista.`,
      url: canonical,
      siteName: 'Musilista',
      locale: 'pt_BR',
      type: 'article',
      images: [`/api/song-cover?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`],
    },
    // variantes (?versao=) não são indexadas — o canonical concentra tudo
    ...(versao ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SongPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { artistSlug, songSlug } = await params;
  const { versao } = await searchParams;
  const group = await loadGroup(artistSlug, songSlug);
  const song = pickVersion(group, versao);
  if (!song) notFound();

  const session = await auth();

  // registra o acesso (recentes) e recupera o estado de favorito numa tacada só —
  // só faz sentido gravar isso quando há um usuário para vincular
  let initialFavorite = false;
  if (session?.user?.id) {
    const [activity] = await db
      .insert(userImportedSongs)
      .values({ userId: session.user.id, importedSongId: song.id })
      .onConflictDoUpdate({
        target: [userImportedSongs.userId, userImportedSongs.importedSongId],
        set: { lastSeen: sql`now()` },
      })
      .returning({ favorite: userImportedSongs.favorite });
    initialFavorite = activity?.favorite ?? false;
  }

  const { blocks, capo, tuning, songKey } = parseStoredContent(song.content);
  const basePath = `/${artistSlug}/${songSlug}`;
  const path = song.versionSlug ? `${basePath}?versao=${song.versionSlug}` : basePath;

  const versions: SongVersionLink[] = group.map((v) => ({
    label: v.versionLabel ?? 'Principal',
    href: v.versionSlug ? `${basePath}?versao=${v.versionSlug}` : basePath,
    current: v.versionSlug === song.versionSlug,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MusicComposition',
        name: song.title,
        composer: { '@type': 'MusicGroup', name: song.artist },
        ...(song.songKey ?? songKey ? { musicalKey: song.songKey ?? songKey } : {}),
        inLanguage: 'pt-BR',
        url: `https://www.musilista.com.br${basePath}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://www.musilista.com.br/' },
          { '@type': 'ListItem', position: 2, name: song.artist, item: `https://www.musilista.com.br/${artistSlug}` },
          { '@type': 'ListItem', position: 3, name: song.title, item: `https://www.musilista.com.br${basePath}` },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SongViewer
        blocks={blocks}
        title={song.title}
        artist={song.artist}
        artistHref={`/${artistSlug}`}
        songKey={song.songKey ?? songKey ?? null}
        capo={capo}
        tuning={tuning}
        songId={song.id}
        path={path}
        versions={versions}
        initialFavorite={initialFavorite}
        hasSession={!!session?.user?.id}
      />
    </>
  );
}
