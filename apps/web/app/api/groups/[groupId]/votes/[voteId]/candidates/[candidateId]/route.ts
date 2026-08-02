import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireGroupMember } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string; voteId: string; candidateId: string }> };

// Define a nota (1-3) da pessoa pra essa música. Repetir a mesma nota já
// dada retira o voto (sempre permitido, mesmo com a rodada fechada, pra não
// deixar ninguém "preso" a um voto). Dar uma nota diferente atualiza. Sem
// limite de quantas músicas pode avaliar — cada música é independente.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { groupId, voteId, candidateId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const { level } = await req.json().catch(() => ({ level: undefined }));
  if (![1, 2, 3].includes(level)) return NextResponse.json({ error: 'Nota inválida' }, { status: 400 });

  const [round] = await db.select().from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const [candidate] = await db.select({ id: votingCandidates.id }).from(votingCandidates)
    .where(and(eq(votingCandidates.id, candidateId), eq(votingCandidates.votingRoundId, voteId))).limit(1);
  if (!candidate) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  const [existingBallot] = await db.select().from(votingBallots)
    .where(and(eq(votingBallots.candidateId, candidateId), eq(votingBallots.userId, userId))).limit(1);

  if (existingBallot?.level === level) {
    await db.delete(votingBallots)
      .where(and(eq(votingBallots.candidateId, candidateId), eq(votingBallots.userId, userId)));
    return NextResponse.json({ level: null });
  }

  if (round.status !== 'open') return NextResponse.json({ error: 'Votação encerrada' }, { status: 400 });

  if (existingBallot) {
    await db.update(votingBallots).set({ level })
      .where(and(eq(votingBallots.candidateId, candidateId), eq(votingBallots.userId, userId)));
  } else {
    await db.insert(votingBallots).values({ candidateId, userId, level }).onConflictDoNothing();
  }

  return NextResponse.json({ level });
}
