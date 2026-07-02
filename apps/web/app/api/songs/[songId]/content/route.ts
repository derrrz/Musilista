import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { songs, songVersions, userSongs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { runMigrations } from '@/app/_lib/songMigrations';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { songId } = await params;
  const canonical = req.nextUrl.searchParams.get('canonical') === '1';

  const song = await db.query.songs.findFirst({ where: eq(songs.id, songId) });
  if (!song) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // ?canonical=1 ignora o rascunho pessoal e retorna apenas a versão publicada
  const userSong = canonical ? null : await db.query.userSongs.findFirst({
    where: and(eq(userSongs.userId, user.id), eq(userSongs.songId, songId)),
  });

  const contentJson = userSong?.draft ?? null;
  let blocks: unknown[] | null = null;
  let syncMeta: Record<string, unknown> | null = null;
  let arrangement: unknown[] | null = null;
  let chordOverrides: Record<string, string[]> | null = null;
  let extraChords: Record<string, string[]> | null = null;
  let loopMarkers: Record<string, { rawBarEnd: number; count: number }> | null = null;

  function parseSongContent(raw: string) {
    const result = runMigrations(raw);
    const c = result.content;
    blocks = Array.isArray(c.blocks) ? c.blocks : null;
    syncMeta = c.syncMeta ?? null;
    arrangement = c.arrangement ?? null;
    chordOverrides = c.chordOverrides ?? null;
    extraChords = c.extraChords ?? null;
    loopMarkers = c.loopMarkers ?? null;
  }

  let isMineCanonical = false;

  if (!contentJson && song.canonicalVersionId) {
    const [version] = await db
      .select()
      .from(songVersions)
      .where(eq(songVersions.id, song.canonicalVersionId));
    if (version) {
      try { parseSongContent(version.content); } catch { /* ignore */ }
      isMineCanonical = version.createdBy === user.id;
    }
  } else if (contentJson) {
    try { parseSongContent(contentJson); } catch { /* ignore */ }
  }

  if (!blocks) return NextResponse.json({ error: 'Sem conteúdo' }, { status: 404 });

  return NextResponse.json({
    songId: song.id,
    title: song.title,
    artist: song.artist,
    sourceUrl: song.sourceUrl ?? null,
    blocks,
    syncMeta,
    arrangement,
    chordOverrides,
    extraChords,
    loopMarkers,
    hasDraft: userSong?.draft !== null && userSong?.draft !== undefined,
    isPublished: song.canonicalVersionId !== null,
    isMineCanonical,
  });
}
