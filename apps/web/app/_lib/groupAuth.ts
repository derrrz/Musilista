import { db } from '@/db';
import { groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export type GroupRole = 'owner' | 'admin' | 'member';

export async function getGroupRole(userId: string, groupId: string): Promise<GroupRole | null> {
  const [row] = await db.select({ role: groupMembers.role }).from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId))).limit(1);
  return (row?.role as GroupRole) ?? null;
}

export function isManager(role: GroupRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

export async function requireGroupMember(groupId: string): Promise<{ userId: string; role: GroupRole } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = await getGroupRole(session.user.id, groupId);
  if (!role) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  return { userId: session.user.id, role };
}
