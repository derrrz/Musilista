// Aplica db/migrations/0022_sharp_the_hunter.sql direto via client,
// pulando drizzle-kit migrate (quebrado — ver memória do projeto).
// Uso: node --env-file=.env.local scripts/apply-migration-0022.mjs [--prod]
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

const sqlPath = new URL('../db/migrations/0022_sharp_the_hunter.sql', import.meta.url);
const raw = readFileSync(sqlPath, 'utf-8');
console.log('Executando:', raw);
await sql(raw);
console.log('OK');

const cols = await sql`
  select column_name, data_type
  from information_schema.columns
  where table_name = 'voting_candidates' and column_name = 'body'
`;
console.log('Colunas confirmadas:', cols);
