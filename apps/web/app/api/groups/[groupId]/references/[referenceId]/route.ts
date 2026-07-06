import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { groupReferences } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';

type Params = { params: Promise<{ groupId: string; referenceId: string }> };

// Remover: quem adicionou ou admin/owner do grupo.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { groupId, referenceId } = await params;
  const auth = await requireGroupMember(groupId);
  if (auth instanceof NextResponse) return auth;

  const [ref] = await db
    .select({ addedBy: groupReferences.addedBy })
    .from(groupReferences)
    .where(and(eq(groupReferences.id, referenceId), eq(groupReferences.groupId, groupId)))
    .limit(1);

  if (!ref) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (ref.addedBy !== auth.userId && !isManager(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(groupReferences).where(eq(groupReferences.id, referenceId));
  return NextResponse.json({ ok: true });
}
