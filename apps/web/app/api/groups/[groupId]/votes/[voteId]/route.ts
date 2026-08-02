import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId, role } = membership;

  const [round] = await db.select().from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });
  if (!isManager(role) && round.createdBy !== userId) {
    return NextResponse.json({ error: 'Só quem criou a rodada ou administra o grupo pode excluir' }, { status: 403 });
  }

  await db.delete(votingRounds).where(eq(votingRounds.id, voteId));
  return NextResponse.json({ ok: true });
}
