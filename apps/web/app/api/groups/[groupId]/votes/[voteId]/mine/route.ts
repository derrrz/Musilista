import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireGroupMember } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

// Cada pessoa pode apagar os próprios votos numa rodada, completos ou não —
// mesma ideia de "sempre pode tirar o voto" do toggle por música
// (candidates/[candidateId]/route.ts), só que a rodada inteira de uma vez.
// Não exige administrar o grupo: é o próprio voto de quem pede, então
// funciona mesmo com a rodada fechada.
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const [round] = await db.select({ id: votingRounds.id }).from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const candidates = await db.select({ id: votingCandidates.id }).from(votingCandidates)
    .where(eq(votingCandidates.votingRoundId, voteId));
  const candidateIds = candidates.map((c) => c.id);
  if (candidateIds.length === 0) return new NextResponse(null, { status: 204 });

  await db.delete(votingBallots)
    .where(and(inArray(votingBallots.candidateId, candidateIds), eq(votingBallots.userId, userId)));

  return new NextResponse(null, { status: 204 });
}
