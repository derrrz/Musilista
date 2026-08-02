// Classifica gênero/estilo das músicas de setlist que já existem no banco
// e ainda não foram classificadas (genero is null).
// Uso: node --env-file=.env.local scripts/backfill-genre.mjs [--prod] [--dry-run]
//   --prod      usa DATABASE_URL_PROD (aceita a linha comentada do .env.local)
//   --dry-run   só lista o que seria classificado, não grava nem chama a IA
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const PROD = args.includes('--prod');
const DRY = args.includes('--dry-run');

let dbUrl = PROD ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (PROD && !dbUrl) {
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  dbUrl = env.match(/^#?\s*DATABASE_URL_PROD=["']?([^"'\n]+)/m)?.[1];
}
if (!dbUrl) { console.error('DATABASE_URL não definida'); process.exit(1); }
process.env.DATABASE_URL = dbUrl;

console.log(PROD ? '⚠️  Rodando contra PRODUÇÃO' : 'Rodando contra dev', DRY ? '(dry-run)' : '');

const { db } = await import('../db/index.ts');
const { repertoireSongs } = await import('../db/schema.ts');
const { and, eq, isNull, ilike } = await import('drizzle-orm');

const rows = await db
  .select()
  .from(repertoireSongs)
  .where(and(
    eq(repertoireSongs.itemType, 'song'),
    isNull(repertoireSongs.genero),
    ilike(repertoireSongs.notes, 'artist:%'),
  ));

console.log(`${rows.length} linha(s) elegível(is).`);
if (DRY) {
  for (const row of rows) console.log(`- "${row.title}" (${row.notes})`);
  process.exit(0);
}

const { classifySongGenre } = await import('../app/_lib/songGenreClassifier.ts');
let done = 0;
for (const row of rows) {
  const artist = row.notes.replace(/^artist:/, '').split(' | ')[0].trim();
  const { genero, estilos } = await classifySongGenre({ title: row.title, artist });
  await db.update(repertoireSongs).set({ genero, estilos }).where(eq(repertoireSongs.id, row.id));
  done += 1;
  console.log(`[${done}/${rows.length}] "${row.title}" (${artist}) -> genero=${genero}, estilos=${JSON.stringify(estilos)}`);
}
console.log('Backfill concluído.');
