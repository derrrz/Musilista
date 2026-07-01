import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { groups, groupMembers } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { generateInviteCode } from '@/app/_lib/inviteCode';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

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

  const withCounts = await Promise.all(
    rows.map(async (g) => {
      const [{ total }] = await db
        .select({ total: count() })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, g.id));
      return { ...g, memberCount: Number(total) };
    }),
  );

  return NextResponse.json(withCounts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = session.user.id;

  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const inviteCode = generateInviteCode();

  const [group] = await db
    .insert(groups)
    .values({ name: name.trim(), description: description?.trim() || null, inviteCode, createdBy: userId })
    .returning({ id: groups.id, name: groups.name, inviteCode: groups.inviteCode });

  await db.insert(groupMembers).values({ groupId: group.id, userId, role: 'owner' });

  return NextResponse.json(group, { status: 201 });
}
