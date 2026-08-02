import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots } from '@/db/schema';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { requireGroupMember } from '@/app/_lib/groupAuth';

type Ctx = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { groupId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const rounds = await db
    .select()
    .from(votingRounds)
    .where(eq(votingRounds.groupId, groupId))
    .orderBy(desc(votingRounds.createdAt));

  if (rounds.length === 0) return NextResponse.json([]);

  const roundIds = rounds.map((r) => r.id);
  const candidates = await db
    .select({
      id: votingCandidates.id,
      votingRoundId: votingCandidates.votingRoundId,
      title: votingCandidates.title,
      artist: votingCandidates.artist,
      addedBy: votingCandidates.addedBy,
      votes: sql<number>`count(${votingBallots.userId})::int`,
      votedByMe: sql<boolean>`coalesce(bool_or(${votingBallots.userId} = ${userId}), false)`,
    })
    .from(votingCandidates)
    .leftJoin(votingBallots, eq(votingBallots.candidateId, votingCandidates.id))
    .where(inArray(votingCandidates.votingRoundId, roundIds))
    .groupBy(votingCandidates.id);

  const byRound = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const list = byRound.get(c.votingRoundId) ?? [];
    list.push(c);
    byRound.set(c.votingRoundId, list);
  }

  const result = rounds.map((r) => {
    const cands = (byRound.get(r.id) ?? []).sort((a, b) => b.votes - a.votes);
    return {
      ...r,
      candidates: cands,
      myVotesUsed: cands.filter((c) => c.votedByMe).length,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { groupId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const { title, maxVotesPerMember, candidates } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });

  const maxVotes = Number.isInteger(maxVotesPerMember) && maxVotesPerMember > 0 ? maxVotesPerMember : 3;

  const [round] = await db
    .insert(votingRounds)
    .values({ groupId, title: title.trim(), maxVotesPerMember: maxVotes, createdBy: userId })
    .returning();

  let seededCandidates: { id: string; title: string; artist: string }[] = [];
  if (Array.isArray(candidates) && candidates.length > 0) {
    const values = candidates
      .filter((c) => c?.title?.trim())
      .map((c) => ({
        votingRoundId: round.id,
        title: String(c.title).trim(),
        artist: String(c.artist ?? '').trim(),
        addedBy: userId,
      }));
    if (values.length > 0) {
      seededCandidates = await db.insert(votingCandidates).values(values).returning({
        id: votingCandidates.id, title: votingCandidates.title, artist: votingCandidates.artist,
      });
    }
  }

  return NextResponse.json({
    ...round,
    candidates: seededCandidates.map((c) => ({ ...c, addedBy: userId, votes: 0, votedByMe: false })),
    myVotesUsed: 0,
  }, { status: 201 });
}
