import { NextResponse } from 'next/server';
import { db } from '@/db';
import { feedback, users } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';

export async function GET() {
  const user = await getAuthUser();
  if (!user || !TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // leftJoin: feedback anônimo não tem usuário.
  const rows = await db
    .select({
      id: feedback.id,
      message: feedback.message,
      email: feedback.email,
      imageUrl: feedback.imageUrl,
      pageUrl: feedback.pageUrl,
      status: feedback.status,
      createdAt: feedback.createdAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
    .from(feedback)
    .leftJoin(users, eq(feedback.userId, users.id))
    .orderBy(desc(feedback.createdAt));

  const [{ newCount }] = await db
    .select({ newCount: sql<number>`count(*)::int` })
    .from(feedback)
    .where(eq(feedback.status, 'new'));

  return NextResponse.json({ items: rows, newCount });
}
