import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { importedSongs, userImportedSongs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { parseCifraContent, chordRow } from '@/app/_lib/cifra';
import { FavoriteButton } from './FavoriteButton';

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

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

  // registra o acesso (recentes) e recupera o estado de favorito numa tacada só
  const [activity] = await db
    .insert(userImportedSongs)
    .values({ userId: session.user.id, importedSongId: song.id })
    .onConflictDoUpdate({
      target: [userImportedSongs.userId, userImportedSongs.importedSongId],
      set: { lastSeen: sql`now()` },
    })
    .returning({ favorite: userImportedSongs.favorite });

  const blocks = parseCifraContent(song.content);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{song.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{song.artist}</span>
            {song.songKey && (
              <span className="px-2 py-0.5 rounded-full border border-line text-xs">Tom {song.songKey}</span>
            )}
          </div>
        </div>
        <FavoriteButton songId={song.id} initialFavorite={activity?.favorite ?? false} />
      </div>

      <div className="rounded-2xl bg-surface border border-line p-6 font-mono text-sm leading-relaxed overflow-x-auto">
        {blocks.map((block, bi) => (
          <div key={bi} className="mb-4 last:mb-0">
            {block.lines.map((line, li) => {
              const chords = chordRow(line);
              return (
                <div key={li} className="whitespace-pre">
                  {chords && <div className="text-accent">{chords}</div>}
                  <div className="text-ink">{line.text || ' '}</div>
                </div>
              );
            })}
          </div>
        ))}
        {blocks.length === 0 && <p className="text-muted font-sans">Cifra sem conteúdo disponível.</p>}
      </div>
    </div>
  );
}
