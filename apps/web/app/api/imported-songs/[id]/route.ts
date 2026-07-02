import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  return NextResponse.json(song);
}
