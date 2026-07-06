import { auth } from '@/auth';
import { db } from '@/db';
import { groupMembers, repertoires, repertoireSongs } from '@/db/schema';
import { eq, and, max, sql, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { isValidBlockType } from '@/app/_lib/setlistBlocks';

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

  const { title, artist, songKey, bpm, notes, itemType, body, durationSec, segue } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
  const type = itemType === undefined ? 'song' : itemType;
  if (!isValidBlockType(type)) return NextResponse.json({ error: 'Tipo de bloco inválido' }, { status: 400 });

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
      // encoding legado "artist:..." no notes — a agenda pública e o
      // parseArtist do painel dependem dele; não mudar o formato
      notes: artist ? `artist:${artist.trim()}${notes ? ' | ' + notes : ''}` : (notes ?? null),
      songKey: songKey?.trim() || null,
      bpm: bpm ? Number(bpm) : null,
      position,
      itemType: type,
      body: typeof body === 'string' && body.trim() ? body.trim() : null,
      durationSec: durationSec ? Number(durationSec) : null,
      segue: segue === true,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}

// Edita um bloco existente (qualquer membro, como o POST/DELETE).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId, repertoireId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { songItemId, title, body, songKey, bpm, durationSec, segue, notes } = await req.json();
  if (!songItemId) return NextResponse.json({ error: 'songItemId obrigatório' }, { status: 400 });

  const set: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!String(title).trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
    set.title = String(title).trim();
  }
  if (body !== undefined) set.body = typeof body === 'string' && body.trim() ? body.trim() : null;
  if (songKey !== undefined) set.songKey = String(songKey).trim() || null;
  if (bpm !== undefined) set.bpm = bpm ? Number(bpm) : null;
  if (durationSec !== undefined) set.durationSec = durationSec ? Number(durationSec) : null;
  if (segue !== undefined) set.segue = segue === true;
  if (notes !== undefined) set.notes = notes ?? null;
  if (Object.keys(set).length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });

  const [updated] = await db
    .update(repertoireSongs)
    .set(set)
    .where(and(eq(repertoireSongs.id, songItemId), eq(repertoireSongs.repertoireId, repertoireId)))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Bloco não encontrado' }, { status: 404 });
  return NextResponse.json(updated);
}

// Reordena os blocos do setlist. Um único UPDATE (driver neon-http não tem
// transação) — posições vêm da ordem do array recebido.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId, repertoireId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { orderedIds } = await req.json();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0 || !orderedIds.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'orderedIds obrigatório' }, { status: 400 });
  }

  // valida que todos os ids pertencem a este repertório
  const rows = await db
    .select({ id: repertoireSongs.id })
    .from(repertoireSongs)
    .where(and(eq(repertoireSongs.repertoireId, repertoireId), inArray(repertoireSongs.id, orderedIds)));
  if (rows.length !== orderedIds.length) {
    return NextResponse.json({ error: 'Itens não pertencem ao setlist' }, { status: 400 });
  }

  // um único statement (driver neon-http não tem transação); o array vai
  // como JSONB porque o driver não serializa array JS para uuid[]
  const payload = JSON.stringify(orderedIds.map((id, i) => ({ id, pos: i })));
  await db.execute(sql`
    update repertoire_songs as rs
    set position = u.pos
    from (
      select (elem->>'id')::uuid as id, (elem->>'pos')::int as pos
      from jsonb_array_elements(${payload}::jsonb) as elem
    ) as u
    where rs.id = u.id and rs.repertoire_id = ${repertoireId}
  `);

  return NextResponse.json({ ok: true });
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
