import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { or, ilike, sql } from 'drizzle-orm';

const SELECT_COLUMNS = { id: importedSongs.id, title: importedSongs.title, artist: importedSongs.artist };

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const letter = req.nextUrl.searchParams.get('letter')?.trim().toUpperCase() ?? '';
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 8, 50);

  if (q) {
    const pattern = `%${q}%`;
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(importedSongs)
      .where(or(ilike(importedSongs.title, pattern), ilike(importedSongs.artist, pattern)))
      .orderBy(importedSongs.title)
      .limit(limit);
    return NextResponse.json({ songs: rows });
  }

  if (letter) {
    const condition = letter === '0-9'
      ? sql`${importedSongs.artist} ~ '^[0-9]'`
      : ilike(importedSongs.artist, `${letter}%`);
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(importedSongs)
      .where(condition)
      .orderBy(importedSongs.artist, importedSongs.title)
      .limit(limit);
    return NextResponse.json({ songs: rows });
  }

  return NextResponse.json({ songs: [] });
}
