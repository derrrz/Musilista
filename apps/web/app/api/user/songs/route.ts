import { NextResponse } from 'next/server';
import { db } from '@/db';
import { songs, songVersions, userSongs } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      songId: songs.id,
      title: songs.title,
      artist: songs.artist,
      slug: songs.slug,
      lastSeen: userSongs.lastSeen,
      draft: userSongs.draft,
      canonicalVersionId: songs.canonicalVersionId,
      canonicalCreatedBy: songVersions.createdBy,
    })
    .from(userSongs)
    .innerJoin(songs, eq(userSongs.songId, songs.id))
    .leftJoin(songVersions, eq(songVersions.id, songs.canonicalVersionId))
    .where(eq(userSongs.userId, user.id))
    .orderBy(desc(userSongs.lastSeen));

  const result = rows.map((r) => ({
    songId: r.songId,
    title: r.title,
    artist: r.artist,
    slug: r.slug,
    lastSeen: r.lastSeen,
    hasDraft: r.draft !== null,
    isPublished: r.canonicalVersionId !== null,
    isMineCanonical: r.canonicalCreatedBy === user.id,
  }));

  return NextResponse.json(result);
}
