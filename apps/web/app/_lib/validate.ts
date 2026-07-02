import { NextResponse } from 'next/server';
import type { ZodType } from 'zod';

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Valida o body JSON de uma request com um schema zod.
 * Uso nas rotas:
 *   const parsed = await parseBody(req, schema);
 *   if (!parsed.ok) return parsed.response;
 *   const data = parsed.data;
 */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Dados inválidos', issues: result.error.issues },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}
