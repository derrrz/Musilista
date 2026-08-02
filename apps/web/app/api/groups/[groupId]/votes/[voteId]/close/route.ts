import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

// Só quem gerencia o grupo (ou quem criou a rodada) fecha a votação — depois
// disso ninguém mais adiciona voto novo (mas ainda pode retirar o próprio).
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId, role } = membership;

  const [round] = await db.select().from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });
  if (!isManager(role) && round.createdBy !== userId) {
    return NextResponse.json({ error: 'Só quem criou a rodada ou administra o grupo pode encerrar' }, { status: 403 });
  }
  if (round.status === 'closed') return NextResponse.json(round);

  const [updated] = await db.update(votingRounds)
    .set({ status: 'closed', closedAt: sql`now()` })
    .where(eq(votingRounds.id, voteId))
    .returning();

  return NextResponse.json(updated);
}
