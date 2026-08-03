import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingGuestBallots } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string; voteId: string; guestId: string }> };

// Apaga os votos de um convidado (pessoa de fora do grupo, sem conta) numa
// rodada — só quem administra o grupo pode, e só dentro do próprio grupo.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId, guestId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  if (!isManager(membership.role)) return NextResponse.json({ error: 'Só quem administra o grupo pode excluir dados de convidado' }, { status: 403 });

  const [round] = await db.select({ id: votingRounds.id }).from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const candidates = await db.select({ id: votingCandidates.id }).from(votingCandidates)
    .where(eq(votingCandidates.votingRoundId, voteId));
  const candidateIds = candidates.map((c) => c.id);
  if (candidateIds.length === 0) return new NextResponse(null, { status: 204 });

  await db.delete(votingGuestBallots)
    .where(and(inArray(votingGuestBallots.candidateId, candidateIds), eq(votingGuestBallots.guestId, guestId)));

  return new NextResponse(null, { status: 204 });
}
