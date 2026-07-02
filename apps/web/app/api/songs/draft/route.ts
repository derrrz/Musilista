import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { songs, userSongs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';
import { songSlug } from '@/app/_lib/songMeta';

const draftSchema = z.object({
  dbSongId: z.string().optional(),
  title: z.string().trim().min(1).max(300),
  artist: z.string().trim().max(300).default(''),
  sourceUrl: z.string().max(2000).optional(),
  content: z.string().min(2), // JSON string de Block[]
  syncMeta: z.object({
    bpm: z.number().optional(),
    beatsPerBar: z.number().optional(),
    offsetSeconds: z.number().optional(),
  }).passthrough().optional(),
  arrangement: z.array(z.unknown()).optional(),
  chordOverrides: z.record(z.string(), z.array(z.string())).optional(),
  extraChords: z.record(z.string(), z.array(z.string())).optional(),
  loopMarkers: z.record(z.string(), z.object({ rawBarEnd: z.number(), count: z.number() })).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, draftSchema);
  if (!parsed.ok) return parsed.response;
  const { dbSongId, title, artist, sourceUrl, content, syncMeta, arrangement, chordOverrides, extraChords, loopMarkers } = parsed.data;

  let blocks: unknown;
  try {
    blocks = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: 'content não é JSON válido' }, { status: 400 });
  }

  // Serializa blocks + syncMeta + arrangement + overrides + loopMarkers num único JSON
  const draftJson = JSON.stringify({
    blocks,
    ...(syncMeta ? { syncMeta } : {}),
    ...(arrangement?.length ? { arrangement } : {}),
    ...(chordOverrides && Object.keys(chordOverrides).length ? { chordOverrides } : {}),
    ...(extraChords && Object.keys(extraChords).length ? { extraChords } : {}),
    ...(loopMarkers && Object.keys(loopMarkers).length ? { loopMarkers } : {}),
  });

  const slug = songSlug(artist || '', title || 'sem-titulo');

  // Find or create song entry
  let song = await db.query.songs.findFirst({ where: eq(songs.slug, slug) });
  if (!song) {
    // Se o cliente enviou um dbSongId, a música existia e foi deletada intencionalmente.
    // Não recriar — retorna 410 Gone para o cliente parar de tentar salvar.
    if (dbSongId) {
      return NextResponse.json({ error: 'Song was deleted' }, { status: 410 });
    }
    const [created] = await db
      .insert(songs)
      .values({ title, artist, slug, sourceUrl })
      .returning();
    song = created;
  }

  // Upsert user draft
  const now = new Date().toISOString();
  await db
    .insert(userSongs)
    .values({ userId: user.id, songId: song.id, draft: draftJson, lastSeen: now })
    .onConflictDoUpdate({
      target: [userSongs.userId, userSongs.songId],
      set: { draft: draftJson, lastSeen: now },
    });

  return NextResponse.json({ songId: song.id });
}
