// Aplica db/migrations/0018_skinny_mikhail_rasputin.sql direto via client,
// pulando drizzle-kit migrate (quebrado — ver memória do projeto).
// Uso: node --env-file=.env.local scripts/apply-migration-0018.mjs [--prod]
//   --prod  usa DATABASE_URL_PROD (aceita a linha comentada do .env.local)
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(here, '..', 'db', 'migrations', '0018_skinny_mikhail_rasputin.sql');

const PROD = process.argv.slice(2).includes('--prod');
let dbUrl = PROD ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (PROD && !dbUrl) {
  // DATABASE_URL_PROD vive comentada no .env.local — extrai da linha crua
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  dbUrl = env.match(/^#?\s*DATABASE_URL_PROD=["']?([^"'\n]+)/m)?.[1];
}
if (!dbUrl) { console.error('DATABASE_URL não definida'); process.exit(1); }
const sql = neon(dbUrl);

console.log(PROD ? '⚠️  Aplicando em PRODUÇÃO' : 'Aplicando em dev');

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

const cols = await sql`
  select column_name, data_type, is_nullable
  from information_schema.columns
  where table_name = 'repertoire_songs' and column_name in ('genero', 'estilos')
`;
console.log('Colunas confirmadas:', cols);
