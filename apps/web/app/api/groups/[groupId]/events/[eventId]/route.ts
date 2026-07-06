import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, eventRepertoires, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { validRepertoireIds, syncEventRepertoires } from '@/app/_lib/eventSetlists';

type Params = { params: Promise<{ groupId: string; eventId: string }> };

async function getAccess(groupId: string, userId: string) {
  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return membership ?? null;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, eventId } = await params;
  const membership = await getAccess(groupId, session.user.id);
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.groupId, groupId)))
    .limit(1);

  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // setlists vinculados (N:N) — o form de edição precisa deles
  const links = await db
    .select({ repertoireId: eventRepertoires.repertoireId })
    .from(eventRepertoires)
    .where(eq(eventRepertoires.eventId, eventId));
  const repertoireIds = links.map((l) => l.repertoireId);
  if (repertoireIds.length === 0 && event.repertoireId) repertoireIds.push(event.repertoireId);

  return NextResponse.json({ ...event, repertoireIds });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, eventId } = await params;
  const membership = await getAccess(groupId, session.user.id);
  if (!membership || membership.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { title, eventDate, eventTime, location, eventType, notice, technicalRider, repertoireIds } = body;

  if (!title?.trim() || !eventDate) {
    return NextResponse.json({ error: 'Título e data são obrigatórios' }, { status: 400 });
  }

  const reps = repertoireIds !== undefined ? await validRepertoireIds(groupId, repertoireIds) : undefined;
  if (reps === null) return NextResponse.json({ error: 'Setlist inválido' }, { status: 400 });

  const [updated] = await db
    .update(events)
    .set({
      title: title.trim(),
      eventDate,
      eventTime: eventTime || null,
      location: location?.trim() || null,
      eventType: eventType || 'other',
      notice: notice?.trim() || null,
      technicalRider: technicalRider?.trim() || null,
    })
    .where(and(eq(events.id, eventId), eq(events.groupId, groupId)))
    .returning({ id: events.id });

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (reps !== undefined) await syncEventRepertoires(eventId, reps);

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId, eventId } = await params;
  const membership = await getAccess(groupId, session.user.id);
  if (!membership || membership.role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(events).where(and(eq(events.id, eventId), eq(events.groupId, groupId)));
  return NextResponse.json({ ok: true });
}
