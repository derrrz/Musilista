import { encode } from 'next-auth/jwt';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function mobileSignIn(email: string, name: string | null, image: string | null): Promise<string> {
  let userId: string;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    userId = existing[0].id;
  } else {
    const inserted = await db.insert(users).values({ email, name: name ?? null, image: image ?? null }).returning({ id: users.id });
    userId = inserted[0].id;
  }
  const token = await encode({
    token: { sub: userId, email },
    secret: process.env.AUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60,
    salt: process.env.AUTH_SECRET!,
  });
  return token;
}
