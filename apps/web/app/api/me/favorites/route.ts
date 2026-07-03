import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { userImportedSongs, importedSongs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: importedSongs.id,
      title: importedSongs.title,
      artist: importedSongs.artist,
      favoritedAt: userImportedSongs.lastSeen,
    })
    .from(userImportedSongs)
    .innerJoin(importedSongs, eq(userImportedSongs.importedSongId, importedSongs.id))
    .where(and(eq(userImportedSongs.userId, user.id), eq(userImportedSongs.favorite, true)))
    .orderBy(desc(userImportedSongs.lastSeen))
    .limit(100);

  return NextResponse.json({ songs: rows });
}

const toggleSchema = z.object({
  importedSongId: z.string().uuid(),
  favorite: z.boolean(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, toggleSchema);
  if (!parsed.ok) return parsed.response;
  const { importedSongId, favorite } = parsed.data;

  const [song] = await db.select({ id: importedSongs.id })
    .from(importedSongs).where(eq(importedSongs.id, importedSongId)).limit(1);
  if (!song) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  await db.insert(userImportedSongs)
    .values({ userId: user.id, importedSongId, favorite })
    .onConflictDoUpdate({
      target: [userImportedSongs.userId, userImportedSongs.importedSongId],
      set: { favorite },
    });

  return NextResponse.json({ ok: true, favorite });
}
