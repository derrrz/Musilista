import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { EventForm } from '../../EventForm';

export default async function EditEventPage({ params }: { params: Promise<{ groupId: string; eventId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { groupId, eventId } = await params;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id)))
    .limit(1);

  if (!membership) redirect('/groups');
  if (membership.role === 'member') redirect(`/groups/${groupId}`);

  const [event] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, eventId), eq(events.groupId, groupId)))
    .limit(1);

  if (!event) redirect(`/groups/${groupId}`);

  return (
    <EventForm
      groupId={groupId}
      eventId={eventId}
      initial={{
        title: event.title,
        eventDate: event.eventDate,
        eventTime: event.eventTime ?? '',
        location: event.location ?? '',
        eventType: event.eventType,
        notice: event.notice ?? '',
        technicalRider: event.technicalRider ?? '',
      }}
    />
  );
}
