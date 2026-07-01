import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { groups, groupMembers, users } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { isPrivilegedRole } from '@/app/_lib/authUser';
import { GroupsView } from './GroupsView';

export default async function GroupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  const userId = session.user.id;

  const [account] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1);

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      inviteCode: groups.inviteCode,
      image: groups.image,
      role: groupMembers.role,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId));

  const userGroups = await Promise.all(
    rows.map(async (g) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, g.id));
      return { ...g, memberCount: Number(total) };
    }),
  );

  return (
    <GroupsView
      groups={userGroups}
      userName={session.user.name ?? ''}
      userImage={session.user.image ?? null}
      isAdmin={isPrivilegedRole(account?.role)}
    />
  );
}
