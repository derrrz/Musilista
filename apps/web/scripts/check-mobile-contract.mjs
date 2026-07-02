// Verifica o contrato de auth do app mobile contra o dev server local.
// O mobile (apps/mobile/lib/api.ts) manda `Cookie: authjs.session-token=<jwt>`,
// onde o jwt vem de POST /api/auth/mobile-signin (encode com salt = nome do cookie).
// O nome é fixado em auth.ts (SESSION_COOKIE) para ser igual em dev e prod.
// Este script reproduz esse fluxo e testa qual nome de cookie o auth() aceita.
//
// Uso: node scripts/check-mobile-contract.mjs [baseUrl] [email]
//   baseUrl default: http://localhost:3999
//   email   default: lopesedersouza@gmail.com (precisa existir na tabela users)

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'package.json'));
const { encode } = require('next-auth/jwt');

// Carrega AUTH_SECRET e DATABASE_URL do .env.local sem depender de dotenv
for (const line of readFileSync(join(here, '..', '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=["']?([^"']*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const baseUrl = process.argv[2] ?? 'http://localhost:3999';
const email = process.argv[3] ?? 'lopesedersouza@gmail.com';
const secret = process.env.AUTH_SECRET;
if (!secret) { console.error('FALHA: AUTH_SECRET ausente'); process.exit(1); }

// Resolve o id real do usuário, como o mobile-signin faz
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`select id from users where email = ${email} limit 1`;
if (rows.length === 0) { console.error(`FALHA: usuário ${email} não existe no banco`); process.exit(1); }
const userId = rows[0].id;

// O que o mobile envia hoje (manter em sincronia com apps/mobile/lib/api.ts):
const MOBILE_COOKIE = 'authjs.session-token';

const token = await encode({
  token: { sub: userId, email },
  secret,
  maxAge: 30 * 24 * 60 * 60,
  salt: MOBILE_COOKIE,
});
const res = await fetch(`${baseUrl}/api/groups`, {
  headers: { Cookie: `${MOBILE_COOKIE}=${token}` },
});
const passed = res.status === 200;
console.log(`${passed ? '✓' : '✗'} cookie "${MOBILE_COOKIE}" → ${res.status}`);

console.log(passed
  ? 'OK: contrato mobile preservado.'
  : 'FALHA: o cookie que o mobile envia não autentica — investigar antes de qualquer release.');
process.exit(passed ? 0 : 1);
