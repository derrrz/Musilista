// Rastreio de gasto da classificação de gênero/estilo (OpenAI direto, chave
// própria em OPENAI_API_KEY — não passa pelo AI Gateway da Vercel, que não
// libera modelos pagos no tier grátis sem top-up real). Freio automático
// pra nunca deixar a chave OpenAI gerar uma cobrança inesperada.
import { db } from '@/db';
import { aiUsageMonthly } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export const AI_GATEWAY_MONTHLY_CAP_USD = 4.5;
const CAP_MICROS = AI_GATEWAY_MONTHLY_CAP_USD * 1_000_000;

// gpt-5-nano — preço em USD por token (não por milhão), confirmado via
// platform.openai.com/docs/pricing em 02/08/2026: US$0,05/M entrada,
// US$0,40/M saída. Convertido pra micro-dólares por token pra somar em
// inteiro sem ponto flutuante. Se o modelo mudar, atualizar esses valores.
const PRICE_INPUT_MICROS_PER_TOKEN = 0.05;
const PRICE_OUTPUT_MICROS_PER_TOKEN = 0.4;

function currentMonth(): string {
	return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

export async function getCurrentMonthUsage(): Promise<{ month: string; costMicros: number; callCount: number; capMicros: number }> {
	const month = currentMonth();
	const [row] = await db.select().from(aiUsageMonthly).where(eq(aiUsageMonthly.month, month)).limit(1);
	return { month, costMicros: row?.estimatedCostMicros ?? 0, callCount: row?.callCount ?? 0, capMicros: CAP_MICROS };
}

export async function isBrakeTripped(): Promise<boolean> {
	const { costMicros } = await getCurrentMonthUsage();
	return costMicros >= CAP_MICROS;
}

export function estimateCostMicros(usage: { inputTokens?: number; outputTokens?: number }): number {
	const input = usage.inputTokens ?? 0;
	const output = usage.outputTokens ?? 0;
	return Math.round(input * PRICE_INPUT_MICROS_PER_TOKEN + output * PRICE_OUTPUT_MICROS_PER_TOKEN);
}

export async function recordUsage(costMicros: number): Promise<void> {
	const month = currentMonth();
	await db.execute(sql`
		insert into ai_usage_monthly (month, estimated_cost_micros, call_count, updated_at)
		values (${month}, ${costMicros}, 1, now())
		on conflict (month) do update set
			estimated_cost_micros = ai_usage_monthly.estimated_cost_micros + excluded.estimated_cost_micros,
			call_count = ai_usage_monthly.call_count + 1,
			updated_at = now()
	`);
}
