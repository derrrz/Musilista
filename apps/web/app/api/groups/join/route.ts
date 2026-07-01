import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { groups, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { normalizeCode } from '@/app/_lib/inviteCode';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { inviteCode } = await req.json();
  if (!inviteCode) return NextResponse.json({ error: 'Código obrigatório' }, { status: 400 });

  const code = normalizeCode(inviteCode);

  const [group] = await db
    .select({ id: groups.id, name: groups.name })
    .from(groups)
    .where(eq(groups.inviteCode, code))
    .limit(1);

  if (!group) return NextResponse.json({ error: 'Código inválido' }, { status: 404 });

  const [existing] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
    .limit(1);

  if (existing) return NextResponse.json({ id: group.id, name: group.name, alreadyMember: true });

  await db.insert(groupMembers).values({ groupId: group.id, userId, role: 'member' });

  return NextResponse.json({ id: group.id, name: group.name }, { status: 201 });
}
