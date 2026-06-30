import { auth } from '@/auth';
import { db } from '@/db';
import { groupMembers, repertoires, repertoireSongs } from '@/db/schema';
import { eq, and, max } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

async function getMembership(groupId: string, userId: string) {
  const [m] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return m ?? null;
}

type Ctx = { params: Promise<{ groupId: string; repertoireId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId, repertoireId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [r] = await db.select({ id: repertoires.id }).from(repertoires).where(eq(repertoires.id, repertoireId)).limit(1);
  if (!r) return NextResponse.json({ error: 'Repertório não encontrado' }, { status: 404 });

  const { title, artist, songKey, bpm, notes } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });

  // next position
  const [{ maxPos }] = await db
    .select({ maxPos: max(repertoireSongs.position) })
    .from(repertoireSongs)
    .where(eq(repertoireSongs.repertoireId, repertoireId));

  const position = (maxPos ?? -1) + 1;

  const [entry] = await db
    .insert(repertoireSongs)
    .values({
      repertoireId,
      title: title.trim(),
      notes: artist ? `artist:${artist.trim()}${notes ? ' | ' + notes : ''}` : (notes ?? null),
      songKey: songKey?.trim() || null,
      bpm: bpm ? Number(bpm) : null,
      position,
      itemType: 'song',
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId, repertoireId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { songItemId } = await req.json();
  if (!songItemId) return NextResponse.json({ error: 'songItemId obrigatório' }, { status: 400 });

  await db
    .delete(repertoireSongs)
    .where(and(eq(repertoireSongs.id, songItemId), eq(repertoireSongs.repertoireId, repertoireId)));

  return NextResponse.json({ ok: true });
}
