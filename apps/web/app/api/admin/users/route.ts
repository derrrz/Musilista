import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { ilike, or, desc } from 'drizzle-orm';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image, role: users.role, createdAt: users.createdAt })
    .from(users)
    .where(q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(100);

  return NextResponse.json(rows);
}
