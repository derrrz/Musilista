import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { songs, songVersions, songProposals, userSongs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { songId } = await params;

  const userSong = await db.query.userSongs.findFirst({
    where: and(eq(userSongs.userId, user.id), eq(userSongs.songId, songId)),
  });
  if (!userSong?.draft) {
    return NextResponse.json({ error: 'Nenhum rascunho para publicar' }, { status: 400 });
  }

  const song = await db.query.songs.findFirst({ where: eq(songs.id, songId) });
  if (!song) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  let status: 'published' | 'pending_review';

  if (!song.canonicalVersionId) {
    // Primeira versão — vira canônica imediatamente
    const [version] = await db
      .insert(songVersions)
      .values({ songId, content: userSong.draft, createdBy: user.id })
      .returning();
    await db.update(songs).set({ canonicalVersionId: version.id }).where(eq(songs.id, songId));
    status = 'published';
  } else {
    // Verifica se o usuário é o criador da versão canônica atual
    const [canonical] = await db
      .select({ createdBy: songVersions.createdBy })
      .from(songVersions)
      .where(eq(songVersions.id, song.canonicalVersionId));

    if (canonical?.createdBy === user.id) {
      // Criador do canonical atualiza diretamente
      const [version] = await db
        .insert(songVersions)
        .values({ songId, content: userSong.draft, createdBy: user.id })
        .returning();
      await db.update(songs).set({ canonicalVersionId: version.id }).where(eq(songs.id, songId));
      status = 'published';
    } else {
      // Outro usuário — vai para fila de revisão
      await db.insert(songProposals).values({
        songId,
        content: userSong.draft,
        proposedBy: user.id,
      });
      status = 'pending_review';
    }
  }

  // Limpa o rascunho após publicar
  await db
    .update(userSongs)
    .set({ draft: null })
    .where(and(eq(userSongs.userId, user.id), eq(userSongs.songId, songId)));

  return NextResponse.json({ status });
}
