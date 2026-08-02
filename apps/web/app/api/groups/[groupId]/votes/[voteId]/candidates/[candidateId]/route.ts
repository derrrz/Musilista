import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireGroupMember } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string; voteId: string; candidateId: string }> };

// Alterna o voto (like/unlike) — sem corpo. Se a pessoa já votou nessa
// música, retira o voto (sempre permitido, mesmo com a rodada fechada, pra
// não deixar ninguém "preso" a um voto). Se não votou e a rodada está
// aberta, tenta adicionar — só falha se já tiver usado todos os votos.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId, candidateId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const [round] = await db.select().from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const [candidate] = await db.select({ id: votingCandidates.id }).from(votingCandidates)
    .where(and(eq(votingCandidates.id, candidateId), eq(votingCandidates.votingRoundId, voteId))).limit(1);
  if (!candidate) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  const [existingBallot] = await db.select().from(votingBallots)
    .where(and(eq(votingBallots.candidateId, candidateId), eq(votingBallots.userId, userId))).limit(1);

  if (existingBallot) {
    await db.delete(votingBallots)
      .where(and(eq(votingBallots.candidateId, candidateId), eq(votingBallots.userId, userId)));
    return NextResponse.json({ voted: false });
  }

  if (round.status !== 'open') return NextResponse.json({ error: 'Votação encerrada' }, { status: 400 });

  const [{ used }] = await db
    .select({ used: sql<number>`count(*)::int` })
    .from(votingBallots)
    .innerJoin(votingCandidates, eq(votingCandidates.id, votingBallots.candidateId))
    .where(and(eq(votingCandidates.votingRoundId, voteId), eq(votingBallots.userId, userId)));

  if (used >= round.maxVotesPerMember) {
    return NextResponse.json({ error: `Você já usou seus ${round.maxVotesPerMember} votos nessa rodada` }, { status: 400 });
  }

  await db.insert(votingBallots).values({ candidateId, userId }).onConflictDoNothing();
  return NextResponse.json({ voted: true });
}
