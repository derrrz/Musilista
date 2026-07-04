import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { importedSongs, userImportedSongs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Conteúdo de cifra do acervo para o app mobile — público, como a página
// /songs/[id] da web. Com sessão, também registra o acesso (recentes) e
// devolve o estado de favorito, espelhando o comportamento da página.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  if (!song) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  let favorite = false;
  if (session?.user?.id) {
    const [activity] = await db
      .insert(userImportedSongs)
      .values({ userId: session.user.id, importedSongId: song.id })
      .onConflictDoUpdate({
        target: [userImportedSongs.userId, userImportedSongs.importedSongId],
        set: { lastSeen: sql`now()` },
      })
      .returning({ favorite: userImportedSongs.favorite });
    favorite = activity?.favorite ?? false;
  }

  return NextResponse.json({ ...song, favorite });
}
