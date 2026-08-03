import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots, votingGuestBallots, importedSongs, groupMembers, users } from '@/db/schema';
import { eq, asc, desc, inArray, sql } from 'drizzle-orm';
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

  // placar = soma das notas (1-3) de membros + convidados — subqueries
  // escalares (não join) pra não duplicar linha por causa do join duplo.
  const votesExpr = sql<number>`
    coalesce((select sum(${votingBallots.level}) from ${votingBallots} where ${votingBallots.candidateId} = ${votingCandidates.id}), 0)
    + coalesce((select sum(${votingGuestBallots.level}) from ${votingGuestBallots} where ${votingGuestBallots.candidateId} = ${votingCandidates.id}), 0)
  `;

  const candidates = await db
    .select({
      id: votingCandidates.id,
      votingRoundId: votingCandidates.votingRoundId,
      title: votingCandidates.title,
      artist: votingCandidates.artist,
      body: votingCandidates.body,
      addedBy: votingCandidates.addedBy,
      artistSlug: importedSongs.artistSlug,
      titleSlug: importedSongs.titleSlug,
      votes: votesExpr.mapWith(Number),
      myLevel: sql<number | null>`(select ${votingBallots.level} from ${votingBallots} where ${votingBallots.candidateId} = ${votingCandidates.id} and ${votingBallots.userId} = ${userId})`,
    })
    .from(votingCandidates)
    .leftJoin(importedSongs, eq(importedSongs.id, votingCandidates.importedSongId))
    .where(inArray(votingCandidates.votingRoundId, roundIds))
    // ordem estável (não pelo placar) — a sessão guiada de votação usa essa
    // ordem direto, sem embaralhar conforme os votos mudam.
    .orderBy(asc(votingCandidates.createdAt));

  const byRound = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const list = byRound.get(c.votingRoundId) ?? [];
    list.push(c);
    byRound.set(c.votingRoundId, list);
  }

  // Painel de progresso: pra cada rodada, quantas músicas cada membro do
  // grupo (e cada convidado que já votou) já avaliou — contagem de músicas
  // com alguma nota (1, 2 ou 3, tanto faz qual), sobre o total de músicas
  // da rodada. Não é soma de pontos nem revela em qual música a nota foi
  // dada, só quanto falta pra passar por todas.
  const members = await db
    .select({ userId: groupMembers.userId, name: users.name, email: users.email })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId));

  const memberGiven = await db
    .select({
      votingRoundId: votingCandidates.votingRoundId,
      userId: votingBallots.userId,
      given: sql<number>`count(*)`.mapWith(Number),
    })
    .from(votingBallots)
    .innerJoin(votingCandidates, eq(votingCandidates.id, votingBallots.candidateId))
    .where(inArray(votingCandidates.votingRoundId, roundIds))
    .groupBy(votingCandidates.votingRoundId, votingBallots.userId);

  const guestGiven = await db
    .select({
      votingRoundId: votingCandidates.votingRoundId,
      guestId: votingGuestBallots.guestId,
      guestName: sql<string>`max(${votingGuestBallots.guestName})`,
      given: sql<number>`count(*)`.mapWith(Number),
    })
    .from(votingGuestBallots)
    .innerJoin(votingCandidates, eq(votingCandidates.id, votingGuestBallots.candidateId))
    .where(inArray(votingCandidates.votingRoundId, roundIds))
    .groupBy(votingCandidates.votingRoundId, votingGuestBallots.guestId);

  const result = rounds.map((r) => {
    const cands = (byRound.get(r.id) ?? []).sort((a, b) => b.votes - a.votes);
    const max = cands.length;
    const participants = [
      ...members.map((m) => ({
        name: m.name || m.email,
        given: memberGiven.find((g) => g.votingRoundId === r.id && g.userId === m.userId)?.given ?? 0,
        max,
        guestId: null as string | null,
      })),
      ...guestGiven
        .filter((g) => g.votingRoundId === r.id)
        .map((g) => ({ name: g.guestName, given: g.given, max, guestId: g.guestId })),
    ];
    return { ...r, candidates: cands, participants };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { groupId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const { title, candidates } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });

  const [round] = await db
    .insert(votingRounds)
    .values({ groupId, title: title.trim(), createdBy: userId })
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
    candidates: seededCandidates.map((c) => ({ ...c, addedBy: userId, votes: 0, myLevel: null })),
  }, { status: 201 });
}
