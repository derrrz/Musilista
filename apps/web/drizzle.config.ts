import type { Config } from 'drizzle-kit';

// drizzle-kit só carrega .env por padrão; o projeto usa .env.local (Next)
if (!process.env.DATABASE_URL) process.loadEnvFile('.env.local');

export default {
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  out: './db/migrations',
  schema: './db/schema.ts',
} satisfies Config;
