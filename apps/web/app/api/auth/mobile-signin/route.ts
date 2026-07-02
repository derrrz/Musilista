import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encode } from 'next-auth/jwt';
import { SESSION_COOKIE } from '@/auth';

export async function POST(req: NextRequest) {
  const { idToken } = await req.json() as { idToken: string };
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });

  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (!res.ok) return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });

  const info = await res.json() as { email: string; name?: string; picture?: string; aud?: string };

  const allowedAudience = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? process.env.AUTH_GOOGLE_ID;
  if (allowedAudience && info.aud !== allowedAudience) {
    return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 });
  }

  const existing = await db.select({ id: users.id })
    .from(users).where(eq(users.email, info.email)).limit(1);

  let userId: string;
  if (existing.length === 0) {
    const [created] = await db.insert(users)
      .values({ email: info.email, name: info.name ?? null, image: info.picture ?? null })
      .returning({ id: users.id });
    userId = created.id;
  } else {
    userId = existing[0].id;
  }

  const token = await encode({
    token: { sub: userId, email: info.email },
    secret: process.env.AUTH_SECRET!,
    maxAge: 30 * 24 * 60 * 60,
    salt: SESSION_COOKIE,
  });

  return NextResponse.json({ token });
}
