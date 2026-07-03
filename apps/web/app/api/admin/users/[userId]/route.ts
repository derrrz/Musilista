import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';

// Tags especiais: exclusivas (1 titular) e atribuíveis/removíveis apenas pelo CEO
const SPECIAL_ROLES = ['cto'];
const VALID_ROLES = ['user', 'moderator', 'admin', 'ceo', ...SPECIAL_ROLES] as [string, ...string[]];

const patchSchema = z.object({ role: z.enum(VALID_ROLES) });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const me = await getAuthUser();
  if (!me || !isPrivilegedRole(me.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { role } = parsed.data;

  const [target] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!target) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  // CEO nunca pode ser alterado por ninguém
  if (target.role === 'ceo') {
    return NextResponse.json({ error: 'O role do CEO não pode ser alterado' }, { status: 403 });
  }

  // Tags especiais: só o CEO pode atribuir ou remover
  const isAssigningSpecial = SPECIAL_ROLES.includes(role);
  const isRemovingSpecial = SPECIAL_ROLES.includes(target.role);
  if ((isAssigningSpecial || isRemovingSpecial) && me.role !== 'ceo') {
    return NextResponse.json({ error: 'Apenas o CEO pode gerenciar tags especiais' }, { status: 403 });
  }

  // Admin não pode rebaixar outro admin (sem ser CEO)
  if (target.role === 'admin' && role !== 'admin' && me.role !== 'ceo') {
    return NextResponse.json({ error: 'Apenas o CEO pode alterar o role de um admin' }, { status: 403 });
  }

  // Exclusividade: ao atribuir uma tag especial, remove do titular atual
  if (isAssigningSpecial) {
    await db.update(users).set({ role: 'user' }).where(eq(users.role, role));
  }

  await db.update(users).set({ role }).where(eq(users.id, userId));
  return NextResponse.json({ ok: true });
}
