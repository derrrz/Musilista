import crypto from 'node:crypto';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Autenticação para chamadas máquina-a-máquina (hoje: a Clarice, secretária
// de WhatsApp do Eder, gerenciando os grupos dele). Não existe OAuth aqui —
// um segredo compartilhado (.env dos dois lados) autoriza o chamador, e as
// ações são executadas como o usuário dono do segredo (CLARICE_USER_EMAIL).
// Ver app/api/service/[...path]/route.ts.

function hash(valor: string): Buffer {
  return crypto.createHash('sha256').update(valor).digest();
}

/**
 * Compara o header recebido contra o(s) segredo(s) válidos, sempre em tempo
 * constante. Compara hashes (32 bytes fixos) em vez dos valores crus: com
 * strings de tamanho diferente, crypto.timingSafeEqual lança RangeError em
 * vez de simplesmente falhar a comparação.
 */
export function verificarSegredoServico(header: string | null): boolean {
  if (!header) return false;
  const candidatos = [process.env.CLARICE_SERVICE_SECRET, process.env.CLARICE_SERVICE_SECRET_NEXT]
    .filter((v): v is string => Boolean(v));
  if (!candidatos.length) return false;
  const recebido = hash(header);
  return candidatos.some((s) => crypto.timingSafeEqual(recebido, hash(s)));
}

let cache: { userId: string; expira: number } | null = null;

/** Resolve o userId do dono da conta de serviço (o Eder), com cache curto. */
export async function resolverUsuarioServico(): Promise<string> {
  if (cache && Date.now() < cache.expira) return cache.userId;
  const email = process.env.CLARICE_USER_EMAIL;
  if (!email) throw new Error('CLARICE_USER_EMAIL não configurado');
  const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!row) throw new Error(`Nenhum usuário encontrado com o e-mail ${email}`);
  cache = { userId: row.id, expira: Date.now() + 5 * 60_000 };
  return row.id;
}
