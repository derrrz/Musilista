import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { EventForm } from '../EventForm';

export default async function NewEventPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { groupId } = await params;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id)))
    .limit(1);

  if (!membership) redirect('/groups');
  if (membership.role === 'member') redirect(`/groups/${groupId}`);

  return <EventForm groupId={groupId} />;
}
