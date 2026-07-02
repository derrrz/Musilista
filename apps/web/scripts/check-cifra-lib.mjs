// Sanidade das libs de cifra (transposição) — sem test runner no projeto.
// Uso: node scripts/check-cifra-lib.mjs  (requer tsx? não — compila via ts direto? não)
// As libs são .ts; usamos o transpile do Node 24 (--experimental-strip-types não
// funciona com paths @/), então validamos via import dinâmico com tsx se existir,
// senão com um transpile manual mínimo usando o compilador do projeto.
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, '..');
const tmp = mkdtempSync(join(tmpdir(), 'cifra-check-'));

// Compila só o harmony.ts (puro, sem deps) para JS e testa.
execSync(
  `npx tsc ${join(web, 'app/_lib/harmony.ts')} --outDir ${tmp} --module esnext --target es2022 --moduleResolution bundler --skipLibCheck`,
  { cwd: web, stdio: 'pipe' },
);
const harmony = await import(join(tmp, 'harmony.js'));

// [acorde, semitons, esperado, flats]
const cases = [
  ['C', 2, 'D', false],
  ['Am7', 3, 'Cm7', false],
  ['F#m7(b5)', 1, 'Gm7(b5)', false],
  ['G/B', 2, 'A/C#', false],
  ['Bb', 2, 'C', false],
  ['E7', -1, 'D#7', false],
  ['E7', -1, 'Eb7', true],
];

let failed = 0;
for (const [chord, semis, expected, flats] of cases) {
  const got = harmony.transposeChord(chord, semis, flats);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} transposeChord(${chord}, ${semis}) = ${got}${ok ? '' : ` (esperado ${expected})`}`);
}

rmSync(tmp, { recursive: true, force: true });
console.log(failed === 0 ? 'OK: transposição sã.' : `FALHA: ${failed} casos errados.`);
process.exit(failed === 0 ? 0 : 1);
