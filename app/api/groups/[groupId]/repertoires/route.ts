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

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select()
    .from(repertoires)
    .where(eq(repertoires.groupId, groupId))
    .orderBy(repertoires.createdAt);

  const withCounts = await Promise.all(
    rows.map(async (r) => {
      const songs = await db
        .select()
        .from(repertoireSongs)
        .where(eq(repertoireSongs.repertoireId, r.id))
        .orderBy(repertoireSongs.position);
      return { ...r, songs };
    }),
  );

  return NextResponse.json(withCounts);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { groupId } = await params;
  const m = await getMembership(groupId, session.user.id);
  if (!m || m.role === 'member') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const [r] = await db
    .insert(repertoires)
    .values({ groupId, name: name.trim(), createdBy: session.user.id })
    .returning();

  return NextResponse.json({ ...r, songs: [] }, { status: 201 });
}
