import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Login simulado, só para desenvolvimento local (AUTH_DEV_LOGIN=1 em .env.local).
// Passa pelos mesmos callbacks signIn/jwt — auto-provisiona e resolve id/role do banco.
const devLoginEnabled = process.env.AUTH_DEV_LOGIN === '1' && process.env.NODE_ENV !== 'production';

const devProviders = devLoginEnabled
  ? [
      Credentials({
        id: 'dev',
        name: 'Dev Login',
        credentials: { email: { label: 'Email', type: 'email' } },
        async authorize(credentials) {
          const email = String(credentials?.email ?? '').trim().toLowerCase();
          if (!email.includes('@')) return null;
          return { id: `dev-${email}`, email, name: email.split('@')[0], image: null };
        },
      }),
    ]
  : [];

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    ...devProviders,
    Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! }),
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
