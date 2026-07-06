import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { groups } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';
import { parseBody } from '@/app/_lib/validate';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(280).nullable().optional(),
  image: z.string().url().max(500).nullable().optional(),
});

// Edição da identidade do grupo (home do grupo) — só admin/owner.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const auth = await requireGroupMember(groupId);
  if (auth instanceof NextResponse) return auth;
  if (!isManager(auth.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { name, description, image } = parsed.data;
  if (name === undefined && description === undefined && image === undefined) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
  }

  const [updated] = await db
    .update(groups)
    .set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(image !== undefined ? { image } : {}),
    })
    .where(eq(groups.id, groupId))
    .returning({ id: groups.id, name: groups.name, description: groups.description, image: groups.image });

  return NextResponse.json(updated);
}
