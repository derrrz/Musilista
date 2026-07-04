import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { importedSongs, userImportedSongs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { parseCifraContent, parseCifraHeaderMeta } from '@/app/_lib/cifra';
import { SongViewer } from './SongViewer';

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  const { id } = await params;
  const [song] = await db
    .select({
      id: importedSongs.id,
      title: importedSongs.title,
      artist: importedSongs.artist,
      songKey: importedSongs.songKey,
      content: importedSongs.content,
    })
    .from(importedSongs)
    .where(eq(importedSongs.id, id))
    .limit(1);

  if (!song) notFound();

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

  const blocks = parseCifraContent(song.content);
  const { capo, tuning } = parseCifraHeaderMeta(song.content);

  return (
    <SongViewer
      blocks={blocks}
      title={song.title}
      artist={song.artist}
      songKey={song.songKey}
      capo={capo}
      tuning={tuning}
      songId={song.id}
      initialFavorite={initialFavorite}
      hasSession={!!session?.user?.id}
    />
  );
}
