import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { eventAcknowledgments, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ groupId: string; eventId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, eventId } = await params;
  const userId = session.user.id;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  await db
    .insert(eventAcknowledgments)
    .values({ eventId, userId })
    .onConflictDoNothing();

  return NextResponse.json({ ok: true });
}
