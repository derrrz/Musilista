import type { Config } from 'drizzle-kit';
export default {
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  out: './db/migrations',
  schema: './db/schema.ts',
} satisfies Config;
