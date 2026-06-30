import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export type AuthUser = { id: string; email: string; name: string | null; image: string | null; role: string };

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db.select({ id: users.id, email: users.email, name: users.name, image: users.image, role: users.role })
    .from(users).where(eq(users.id, session.user.id)).limit(1);
  return user ?? null;
}

export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return user;
}
