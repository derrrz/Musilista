import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  groups, groupMembers, events, eventRoles, eventAcknowledgments,
  users, repertoires, eventRepertoires,
} from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { GroupDetail } from './GroupDetail';

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { groupId } = await params;
  const userId = session.user.id;

  const [account] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership) redirect('/groups');

  const [group] = await db
    .select({ id: groups.id, name: groups.name, description: groups.description, inviteCode: groups.inviteCode, image: groups.image })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) redirect('/groups');

  const [{ memberCount }] = await db
    .select({ memberCount: count() })
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
      location: events.location,
      publicToken: events.publicToken,
      repertoireId: events.repertoireId,
    })
    .from(events)
    .where(eq(events.groupId, groupId))
    .orderBy(events.eventDate);

  const enrichedEvents = await Promise.all(
    eventsRows.map(async (ev) => {
      const [rolesRows, ackRows, repsRows] = await Promise.all([
        db
          .select({ id: eventRoles.id, roleName: eventRoles.roleName, userId: eventRoles.userId, userName: users.name })
          .from(eventRoles)
          .leftJoin(users, eq(eventRoles.userId, users.id))
          .where(eq(eventRoles.eventId, ev.id)),
        db
          .select({ userId: eventAcknowledgments.userId })
          .from(eventAcknowledgments)
          .where(eq(eventAcknowledgments.eventId, ev.id)),
        db
          .select({ repertoireId: eventRepertoires.repertoireId, name: repertoires.name })
          .from(eventRepertoires)
          .leftJoin(repertoires, eq(eventRepertoires.repertoireId, repertoires.id))
          .where(eq(eventRepertoires.eventId, ev.id)),
      ]);

      return {
        ...ev,
        roles: rolesRows,
        acknowledgedCount: ackRows.length,
        userAcknowledged: ackRows.some((a) => a.userId === userId),
        repertoireLinks: repsRows,
      };
    }),
  );

  const roleMap: Record<string, string> = { owner: 'DONO', admin: 'ADMIN', member: 'MEMBRO' };

  return (
    <GroupDetail
      group={{ ...group, myRole: roleMap[membership.role] ?? 'MEMBRO', memberCount }}
      events={enrichedEvents}
      userName={session.user.name ?? ''}
      userImage={session.user.image ?? null}
      isAdmin={account?.role === 'admin'}
    />
  );
}
