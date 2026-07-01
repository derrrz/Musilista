import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ groupId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select()
    .from(events)
    .where(eq(events.groupId, groupId))
    .orderBy(events.eventDate);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership || membership.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, eventDate, eventTime, location, eventType, notice, technicalRider } = body;

  if (!title?.trim() || !eventDate) {
    return NextResponse.json({ error: 'Título e data são obrigatórios' }, { status: 400 });
  }

  const [event] = await db
    .insert(events)
    .values({
      groupId,
      title: title.trim(),
      eventDate,
      eventTime: eventTime || null,
      location: location?.trim() || null,
      eventType: eventType || 'other',
      notice: notice?.trim() || null,
      technicalRider: technicalRider?.trim() || null,
      createdBy: userId,
    })
    .returning({ id: events.id });

  return NextResponse.json(event, { status: 201 });
}
