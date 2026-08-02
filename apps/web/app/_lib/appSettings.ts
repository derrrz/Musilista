import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Flags simples do produto — hoje só o liga/desliga do widget de feedback.
// Ausência de linha = habilitado (feature já nasceu ligada antes dessa flag
// existir); só desliga quando alguém explicitamente grava 'false'.
const FEEDBACK_ENABLED_KEY = 'feedback_enabled';

// Cache em memória do processo (10s) — o layout raiz chama isso em toda
// página renderizada no servidor, não faz sentido bater no banco sempre.
let cache: { value: boolean; exp: number } | null = null;

export async function feedbackEnabled(): Promise<boolean> {
  if (cache && cache.exp > Date.now()) return cache.value;
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, FEEDBACK_ENABLED_KEY))
      .limit(1);
    const value = row ? row.value === 'true' : true;
    cache = { value, exp: Date.now() + 10_000 };
    return value;
  } catch {
    // banco fora do ar não pode derrubar o layout raiz inteiro — falha aberto
    return true;
  }
}

export async function setFeedbackEnabled(enabled: boolean): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: FEEDBACK_ENABLED_KEY, value: String(enabled), updatedAt: sql`now()` })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: String(enabled), updatedAt: sql`now()` },
    });
  cache = { value: enabled, exp: Date.now() + 10_000 };
}
