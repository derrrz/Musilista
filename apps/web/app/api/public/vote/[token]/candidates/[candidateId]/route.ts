import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingGuestBallots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Ctx = { params: Promise<{ token: string; candidateId: string }> };

// Espelha a lógica de app/api/groups/[groupId]/votes/[voteId]/candidates/[candidateId]/route.ts
// (mesma nota de novo remove, nota diferente atualiza), mas sem auth —
// identidade é o guestId gerado no navegador do convidado, sem conta.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { token, candidateId } = await params;

  const { guestId, guestName, level } = await req.json().catch(() => ({}));
  if (typeof guestId !== 'string' || !guestId) return NextResponse.json({ error: 'guestId obrigatório' }, { status: 400 });
  if (typeof guestName !== 'string' || !guestName.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  if (![1, 2, 3].includes(level)) return NextResponse.json({ error: 'Nota inválida' }, { status: 400 });

  const [round] = await db.select().from(votingRounds).where(eq(votingRounds.inviteToken, token)).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const [candidate] = await db.select({ id: votingCandidates.id }).from(votingCandidates)
    .where(and(eq(votingCandidates.id, candidateId), eq(votingCandidates.votingRoundId, round.id))).limit(1);
  if (!candidate) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  const [existingBallot] = await db.select().from(votingGuestBallots)
    .where(and(eq(votingGuestBallots.candidateId, candidateId), eq(votingGuestBallots.guestId, guestId))).limit(1);

  if (existingBallot?.level === level) {
    await db.delete(votingGuestBallots)
      .where(and(eq(votingGuestBallots.candidateId, candidateId), eq(votingGuestBallots.guestId, guestId)));
    return NextResponse.json({ level: null });
  }

  if (round.status !== 'open') return NextResponse.json({ error: 'Votação encerrada' }, { status: 400 });

  if (existingBallot) {
    await db.update(votingGuestBallots).set({ level, guestName: guestName.trim() })
      .where(and(eq(votingGuestBallots.candidateId, candidateId), eq(votingGuestBallots.guestId, guestId)));
  } else {
    await db.insert(votingGuestBallots).values({ candidateId, guestId, guestName: guestName.trim(), level })
      .onConflictDoNothing();
  }

  return NextResponse.json({ level });
}
