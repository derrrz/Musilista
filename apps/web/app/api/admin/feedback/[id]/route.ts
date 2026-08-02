import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { z } from 'zod';
import { db } from '@/db';
import { feedback } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';

const patchSchema = z.object({
  status: z.enum(['new', 'seen', 'resolved']),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || !TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  const [row] = await db
    .update(feedback)
    .set({ status: parsed.data.status, updatedAt: new Date().toISOString() })
    .where(eq(feedback.id, id))
    .returning({ id: feedback.id, status: feedback.status });
  if (!row) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user || !TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const [row] = await db.select({ imageUrl: feedback.imageUrl }).from(feedback)
    .where(eq(feedback.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  // Apaga o blob junto — sem isso o Blob só cresce (não há GC em lugar nenhum).
  if (row.imageUrl) await del(row.imageUrl).catch(() => {});
  await db.delete(feedback).where(eq(feedback.id, id));

  return NextResponse.json({ ok: true });
}
