import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Spotify from 'next-auth/providers/spotify';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! }),
    Spotify({ clientId: process.env.AUTH_SPOTIFY_ID!, clientSecret: process.env.AUTH_SPOTIFY_SECRET! }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, user.email)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({ email: user.email, name: user.name ?? null, image: user.image ?? null });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const [dbUser] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.email, user.email!)).limit(1);
        if (dbUser) { token.sub = dbUser.id; token.role = dbUser.role; }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
