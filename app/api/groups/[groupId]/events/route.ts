import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  events,
  eventRoles,
  eventAcknowledgments,
  groupMembers,
  users,
  repertoires,
} from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

type Params = { params: Promise<{ groupId: string }> };

const TYPE_MAP: Record<string, string> = { show: 'SHOW', ensaio: 'ENSAIO', other: 'OUTRO' };

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

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const [{ total }] = await db
    .select({ total: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const eventsRows = await db
    .select({
      id: events.id,
      title: events.title,
      eventDate: events.eventDate,
      eventTime: events.eventTime,
      eventType: events.eventType,
      notice: events.notice,
      technicalRider: events.technicalRider,
      publicToken: events.publicToken,
      repertoireId: events.repertoireId,
    })
    .from(events)
    .where(eq(events.groupId, groupId))
    .orderBy(events.eventDate);

  const result = await Promise.all(
    eventsRows.map(async (ev) => {
      const roles = await db
        .select({
          id: eventRoles.id,
          roleName: eventRoles.roleName,
          userName: users.name,
        })
        .from(eventRoles)
        .leftJoin(users, eq(eventRoles.userId, users.id))
        .where(eq(eventRoles.eventId, ev.id));

      const [ack] = await db
        .select({ eventId: eventAcknowledgments.eventId })
        .from(eventAcknowledgments)
        .where(
          and(
            eq(eventAcknowledgments.eventId, ev.id),
            eq(eventAcknowledgments.userId, userId),
          ),
        )
        .limit(1);

      let setlistName: string | undefined;
      if (ev.repertoireId) {
        const [rep] = await db
          .select({ name: repertoires.name })
          .from(repertoires)
          .where(eq(repertoires.id, ev.repertoireId))
          .limit(1);
        setlistName = rep?.name;
      }

      return {
        id: ev.id,
        title: ev.title,
        date: ev.eventDate,
        time: ev.eventTime ?? undefined,
        type: TYPE_MAP[ev.eventType] ?? 'OUTRO',
        description: ev.notice ?? undefined,
        technicalRider: ev.technicalRider ?? undefined,
        publicToken: ev.publicToken ?? undefined,
        setlistId: ev.repertoireId ?? undefined,
        setlistName,
        roles: roles.map((r) => ({
          id: r.id,
          label: r.roleName,
          assigneeName: r.userName ?? undefined,
        })),
        attendanceConfirmed: !!ack,
        totalMembers: total,
      };
    }),
  );

  return NextResponse.json(result);
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
  const { title, eventDate, eventTime, location, eventType, notice, repertoireId } = body;

  if (!title || !eventDate || !eventType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const TYPE_REVERSE: Record<string, string> = { SHOW: 'show', ENSAIO: 'ensaio', OUTRO: 'other' };

  const [created] = await db
    .insert(events)
    .values({
      groupId,
      title,
      eventDate,
      eventTime: eventTime ?? null,
      location: location ?? null,
      eventType: TYPE_REVERSE[eventType] ?? 'other',
      notice: notice ?? null,
      repertoireId: repertoireId ?? null,
      createdBy: userId,
    })
    .returning({ id: events.id });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
