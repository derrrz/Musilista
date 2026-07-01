import { auth } from '@/auth';
import { db } from '@/db';
import { groupMembers, repertoires, repertoireSongs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
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

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId, repertoireId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [r] = await db.select().from(repertoires).where(eq(repertoires.id, repertoireId)).limit(1);
  if (!r || r.groupId !== groupId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const songs = await db
    .select()
    .from(repertoireSongs)
    .where(eq(repertoireSongs.repertoireId, repertoireId))
    .orderBy(repertoireSongs.position);

  return NextResponse.json({ ...r, songs });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId, repertoireId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m || m.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [r] = await db.select({ id: repertoires.id, groupId: repertoires.groupId }).from(repertoires).where(eq(repertoires.id, repertoireId)).limit(1);
  if (!r || r.groupId !== groupId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.delete(repertoires).where(eq(repertoires.id, repertoireId));
  return NextResponse.json({ ok: true });
}
