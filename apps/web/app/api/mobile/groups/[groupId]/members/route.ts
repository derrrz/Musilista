import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { groupMembers, users, userProfiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ groupId: string }> };

const ROLE_MAP: Record<string, string> = { owner: 'DONO', admin: 'ADMIN', member: 'MEMBRO' };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, session.user.id)))
    .limit(1);

  if (!membership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: groupMembers.role,
      availability: userProfiles.availability,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt);

  return NextResponse.json(
    rows.map((m) => ({
      id: m.id,
      name: m.name ?? '',
      email: m.email,
      avatarUrl: m.image ?? undefined,
      role: ROLE_MAP[m.role] ?? 'MEMBRO',
      available: m.availability === 'available',
    })),
  );
}
