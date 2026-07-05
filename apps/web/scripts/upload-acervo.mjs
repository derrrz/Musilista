// Sobe o acervo normalizado (SCR-normalizado/) para imported_songs.
//
// Uso:
//   node --env-file=.env.local scripts/upload-acervo.mjs <pasta> [--wipe] [--dry-run] [--limit N] [--prod]
//
//   <pasta>    raiz com manifest.jsonl + <Artista>/<Título>.txt
//   --wipe     TRUNCATE user_imported_songs + imported_songs antes (destrutivo)
//   --dry-run  valida e mostra o resumo sem escrever nada
//   --limit N  processa só as N primeiras linhas do manifesto
//   --prod     usa DATABASE_URL_PROD (aceita a linha comentada do .env.local)
//
// content = TXT canônico (não JSON) — o web parseia por request e a rota
// mobile sintetiza o JSON do contrato. Retomável: sem --wipe, pula slugs
// já existentes do mesmo origin.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ORIGIN = 'scr-normalizado-2026-07';

// Manter em sincronia com app/_lib/slug.ts
function toSlug(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
const RESERVED_SLUGS = new Set([
  'login', 'planos', 'terms', 'agenda', 'editor', 'songs', 'api',
  'admin', 'groups', 'profile', 'roadmap', 'support', 'artistas',
  'inicio', 'sitemap', 'robots', 'icon', 'favicon', 'manifest',
  'sobre', 'contato', 'busca', 'search', 'conta', 'ajuda', 'blog',
  'privacidade', 'assets', 'static', 'app', 'mobile', 'dashboard',
]);

const args = process.argv.slice(2);
const root = args.find((a) => !a.startsWith('--'));
const WIPE = args.includes('--wipe');
const DRY = args.includes('--dry-run');
const PROD = args.includes('--prod');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;
if (!root) { console.error('faltou a pasta do acervo'); process.exit(1); }

let dbUrl = PROD ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL;
if (PROD && !dbUrl) {
  // DATABASE_URL_PROD vive comentada no .env.local — extrai da linha crua
  const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  dbUrl = env.match(/^#?\s*DATABASE_URL_PROD=["']?([^"'\n]+)/m)?.[1];
}
if (!dbUrl) { console.error('DATABASE_URL não definida'); process.exit(1); }
const sql = neon(dbUrl);

// ── carrega e valida o manifesto inteiro em memória ─────────────────────────
const manifest = readFileSync(join(root, 'manifest.jsonl'), 'utf8')
  .split('\n').filter(Boolean).slice(0, LIMIT).map((l) => JSON.parse(l));

// nome de exibição canônico por artist_slug = variante com mais músicas
const nameVotes = new Map();
for (const m of manifest) {
  const as = toSlug(m.artist);
  if (!nameVotes.has(as)) nameVotes.set(as, new Map());
  const v = nameVotes.get(as);
  v.set(m.artist, (v.get(m.artist) ?? 0) + 1);
}
const canonicalName = new Map();
for (const [as, votes] of nameVotes) {
  canonicalName.set(as, [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0]);
}

const rows = [];
const seen = new Set();
const errors = [];
for (const m of manifest) {
  const artistSlug = toSlug(m.artist);
  const titleSlug = toSlug(m.title);
  const versionSlug = m.label ? toSlug(m.label) : '';
  if (!artistSlug || !titleSlug) { errors.push(`slug vazio: ${m.file}`); continue; }
  if (RESERVED_SLUGS.has(artistSlug)) { errors.push(`slug reservado: ${artistSlug} (${m.file})`); continue; }
  const key = `${artistSlug}/${titleSlug}/${versionSlug}`;
  if (seen.has(key)) { errors.push(`duplicata: ${key} (${m.file})`); continue; }
  seen.add(key);
  const first = artistSlug[0];
  rows.push({
    title: m.title,
    artist: canonicalName.get(artistSlug),
    slug: versionSlug ? `${artistSlug}--${titleSlug}--${versionSlug}` : `${artistSlug}--${titleSlug}`,
    file: m.file,
    letter: first >= '0' && first <= '9' ? '0-9' : first,
    artistFolder: m.file.split('/')[0],
    songKey: m.tom ?? null,
    sourceFile: m.source,
    artistSlug, titleSlug,
    versionLabel: m.label ?? null,
    versionSlug,
  });
}

// grupos onde todas as versões têm rótulo (sem principal): promove a 1ª —
// senão a URL canônica /artista/musica do grupo não teria conteúdo
const groupHasMain = new Set(rows.filter((r) => !r.versionSlug).map((r) => `${r.artistSlug}/${r.titleSlug}`));
let promoted = 0;
for (const r of rows) {
  const g = `${r.artistSlug}/${r.titleSlug}`;
  if (!groupHasMain.has(g)) {
    r.versionSlug = '';
    r.versionLabel = null;
    r.slug = `${r.artistSlug}--${r.titleSlug}`;
    groupHasMain.add(g);
    promoted++;
  }
}
if (promoted) console.log(`promovidos a principal (grupo sem versão-base): ${promoted}`);

console.log(`manifesto: ${manifest.length} | válidos: ${rows.length} | erros: ${errors.length}`);
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exit(1); }
if (DRY) {
  const groups = new Set(rows.map((r) => `${r.artistSlug}/${r.titleSlug}`));
  const artists = new Set(rows.map((r) => r.artistSlug));
  console.log(`dry-run ok: ${groups.size} grupos, ${artists.size} artistas, ${rows.filter((r) => !r.versionSlug).length} principais`);
  process.exit(0);
}

// ── escrita ──────────────────────────────────────────────────────────────────
if (WIPE) {
  console.log('TRUNCATE user_imported_songs, imported_songs...');
  await sql('TRUNCATE user_imported_songs, imported_songs');
}

const existing = new Set(
  (await sql`select slug from imported_songs where origin = ${ORIGIN}`).map((r) => r.slug),
);
const todo = rows.filter((r) => !existing.has(r.slug));
console.log(`já no banco: ${existing.size} | a inserir: ${todo.length}`);

const BATCH = 500;
let done = 0;
for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const values = [];
  const params = [];
  for (const r of batch) {
    const content = readFileSync(join(root, r.file), 'utf8');
    const base = params.length;
    values.push(`($${base + 1},$${base + 2},$${base + 3},$${base + 4},'${ORIGIN}',$${base + 5},$${base + 6},'published',$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12})`);
    params.push(r.title, r.artist, r.slug, content, r.letter, r.artistFolder,
      r.songKey, r.sourceFile, r.artistSlug, r.titleSlug, r.versionLabel, r.versionSlug);
  }
  await sql(
    `insert into imported_songs (title, artist, slug, content, origin, letter, artist_folder, status, song_key, source_file, artist_slug, title_slug, version_label, version_slug) values ${values.join(',')}`,
    params,
  );
  done += batch.length;
  if (done % 5000 < BATCH) console.log(`inseridos ${done}/${todo.length}`);
}

const [count] = await sql`select count(*)::int as n from imported_songs where origin = ${ORIGIN}`;
const [size] = await sql`select pg_size_pretty(pg_database_size(current_database())) as s`;
console.log(`concluído: ${count.n} linhas do origin | banco: ${size.s}`);
