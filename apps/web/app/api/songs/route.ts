import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { isNotNull, ilike, or, and, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  const rows = await db
    .select({ id: songs.id, title: songs.title, artist: songs.artist, slug: songs.slug, createdAt: songs.createdAt })
    .from(songs)
    .where(
      q
        ? and(isNotNull(songs.canonicalVersionId), or(ilike(songs.title, `%${q}%`), ilike(songs.artist, `%${q}%`)))
        : isNotNull(songs.canonicalVersionId),
    )
    .orderBy(desc(songs.createdAt))
    .limit(100);

  return NextResponse.json(rows);
}
