import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { events, groupMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://musilista.vercel.app');

type Params = Promise<{ groupId: string; eventId: string }>;

async function getCallerRole(userId: string, groupId: string) {
  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)))
    .limit(1);
  return membership?.role ?? null;
}

export async function POST(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, eventId } = await params;

  const role = await getCallerRole(session.user.id, groupId);
  if (!role || role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = crypto.randomUUID();

  await db
    .update(events)
    .set({ publicToken: token })
    .where(and(eq(events.id, eventId), eq(events.groupId, groupId)));

  return NextResponse.json({ url: `${APP_URL}/agenda/${token}` });
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { groupId, eventId } = await params;

  const role = await getCallerRole(session.user.id, groupId);
  if (!role || role === 'member') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db
    .update(events)
    .set({ publicToken: null })
    .where(and(eq(events.id, eventId), eq(events.groupId, groupId)));

  return new NextResponse(null, { status: 204 });
}
