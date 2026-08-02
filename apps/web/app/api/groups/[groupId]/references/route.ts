import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { groupReferences, importedSongs, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { requireGroupMember } from '@/app/_lib/groupAuth';

type Params = { params: Promise<{ groupId: string }> };

function detectKind(host: string): string {
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) return 'youtube';
  if (/(^|\.)spotify\.com$/.test(host)) return 'spotify';
  return 'other';
}

// Título best-effort via oEmbed (YouTube) — falha silenciosa, nunca bloqueia.
async function fetchTitle(url: string, kind: string): Promise<string | null> {
  if (kind !== 'youtube') return null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
      { signal: AbortSignal.timeout(3000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.title === 'string' ? data.title.slice(0, 200) : null;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { groupId } = await params;
  const auth = await requireGroupMember(groupId);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({
      id: groupReferences.id,
      url: groupReferences.url,
      title: groupReferences.title,
      kind: groupReferences.kind,
      note: groupReferences.note,
      artist: groupReferences.artist,
      importedSongId: groupReferences.importedSongId,
      artistSlug: importedSongs.artistSlug,
      titleSlug: importedSongs.titleSlug,
      addedBy: groupReferences.addedBy,
      addedByName: users.name,
      createdAt: groupReferences.createdAt,
    })
    .from(groupReferences)
    .leftJoin(users, eq(users.id, groupReferences.addedBy))
    .leftJoin(importedSongs, eq(importedSongs.id, groupReferences.importedSongId))
    .where(eq(groupReferences.groupId, groupId))
    .orderBy(desc(groupReferences.createdAt));

  return NextResponse.json(rows);
}

// Qualquer membro adiciona — as referências compõem a cara do grupo. Dois
// formatos de body: link ({url, note}) ou música levantada em brainstorm
// ({title, artist, importedSongId?, note?}).
export async function POST(req: NextRequest, { params }: Params) {
  const { groupId } = await params;
  const auth = await requireGroupMember(groupId);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 280) : null;

  if (typeof body.title === 'string' && body.title.trim()) {
    const [row] = await db
      .insert(groupReferences)
      .values({
        groupId,
        title: body.title.trim().slice(0, 200),
        artist: typeof body.artist === 'string' ? body.artist.trim().slice(0, 200) : null,
        importedSongId: typeof body.importedSongId === 'string' ? body.importedSongId : null,
        kind: 'song',
        note,
        addedBy: auth.userId,
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  }

  let parsed: URL;
  try {
    parsed = new URL(String(body.url));
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  const kind = detectKind(parsed.host);
  const title = await fetchTitle(parsed.toString(), kind);

  const [row] = await db
    .insert(groupReferences)
    .values({
      groupId,
      url: parsed.toString().slice(0, 500),
      title,
      kind,
      note,
      addedBy: auth.userId,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
