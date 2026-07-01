import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { groups, groupMembers } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

type Params = { params: Promise<{ groupId: string }> };

const ROLE_MAP: Record<string, string> = { owner: 'DONO', admin: 'ADMIN', member: 'MEMBRO' };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id;

  const [row] = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      image: groups.image,
      inviteCode: groups.inviteCode,
      myRole: groupMembers.role,
    })
    .from(groups)
    .innerJoin(groupMembers, and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'Not found or not a member' }, { status: 404 });

  const [{ memberCount }] = await db
    .select({ memberCount: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  return NextResponse.json({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    imageUrl: row.image ?? undefined,
    inviteCode: row.inviteCode,
    myRole: ROLE_MAP[row.myRole] ?? 'MEMBRO',
    memberCount,
  });
}
