import { NextResponse } from 'next/server';
import { db } from '@/db';
import { userImportedSongs, importedSongs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: importedSongs.id,
      title: importedSongs.title,
      artist: importedSongs.artist,
      favorite: userImportedSongs.favorite,
      lastSeen: userImportedSongs.lastSeen,
    })
    .from(userImportedSongs)
    .innerJoin(importedSongs, eq(userImportedSongs.importedSongId, importedSongs.id))
    .where(eq(userImportedSongs.userId, user.id))
    .orderBy(desc(userImportedSongs.lastSeen))
    .limit(10);

  return NextResponse.json({ songs: rows });
}
