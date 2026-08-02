// Aplica db/migrations/0024_fixed_vampiro.sql direto via client,
// pulando drizzle-kit migrate (quebrado — ver memória do projeto).
// Uso: node --env-file=.env.local scripts/apply-migration-0024.mjs [--prod]
//   --prod  usa DATABASE_URL_PROD (aceita a linha comentada do .env.local)
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';

const PROD = process.argv.slice(2).includes('--prod');
let dbUrl = PROD ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (PROD && !dbUrl) {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  dbUrl = env.match(/^#?\s*DATABASE_URL_PROD=["']?([^"'\n]+)/m)?.[1];
}
if (!dbUrl) { console.error('DATABASE_URL não definida'); process.exit(1); }
const sql = neon(dbUrl);

console.log(PROD ? '⚠️  Aplicando em PRODUÇÃO' : 'Aplicando em dev');

const sqlPath = new URL('../db/migrations/0024_fixed_vampiro.sql', import.meta.url);
const raw = readFileSync(sqlPath, 'utf-8');
const statements = raw
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  console.log('Executando:', stmt);
  await sql(stmt);
  console.log('OK');
}

const check = await sql`
  select table_name from information_schema.tables where table_name = 'voting_guest_invites'
`;
console.log('voting_guest_invites ainda existe?', check.length > 0);
