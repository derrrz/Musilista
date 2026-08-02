import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots, repertoires, repertoireSongs } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';
import { classifySongGenre } from '@/app/_lib/songGenreClassifier';

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

// Materializa o resultado (ordenado por votos) num repertório de verdade —
// pode ser chamado com a rodada aberta ou fechada, e mais de uma vez (útil
// se alguém quiser gerar de novo depois de mais votos entrarem). Só quem
// gerencia o grupo decide isso, porque cria dado real (um setlist).
export async function POST(req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId, role } = membership;
  if (!isManager(role)) return NextResponse.json({ error: 'Só quem administra o grupo pode criar o set' }, { status: 403 });

  const [round] = await db.select().from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const { name, topN } = await req.json().catch(() => ({}));

  const ranked = await db
    .select({
      title: votingCandidates.title,
      artist: votingCandidates.artist,
      // placar = soma das notas (1-3), mesmo cálculo do GET /votes
      votes: sql<number>`coalesce(sum(${votingBallots.level}), 0)::int`,
    })
    .from(votingCandidates)
    .leftJoin(votingBallots, eq(votingBallots.candidateId, votingCandidates.id))
    .where(eq(votingCandidates.votingRoundId, voteId))
    .groupBy(votingCandidates.id)
    .orderBy(desc(sql`coalesce(sum(${votingBallots.level}), 0)`));

  const winners = (Number.isInteger(topN) && topN > 0 ? ranked.slice(0, topN) : ranked).filter((r) => r.votes > 0);
  if (winners.length === 0) {
    return NextResponse.json({ error: 'Ninguém votou ainda — não dá pra montar o set' }, { status: 400 });
  }

  const [repertoire] = await db.insert(repertoires).values({
    groupId,
    name: (name?.trim() || `${round.title} (votação)`),
    createdBy: userId,
  }).returning();

  // Classificação caso a caso — em paralelo, isolada por música (uma falha
  // não derruba as outras nem o build-set inteiro).
  const classified = await Promise.all(
    winners.map((w) => (w.artist ? classifySongGenre({ title: w.title, artist: w.artist }) : { genero: null, estilos: [] })),
  );

  await db.insert(repertoireSongs).values(
    winners.map((w, i) => ({
      repertoireId: repertoire.id,
      title: w.title,
      notes: w.artist ? `artist:${w.artist}` : null,
      position: i,
      itemType: 'song',
      genero: classified[i].genero,
      estilos: classified[i].estilos,
    })),
  );

  await db.update(votingRounds).set({ resultRepertoireId: repertoire.id }).where(eq(votingRounds.id, voteId));

  return NextResponse.json({ repertoireId: repertoire.id, repertoireName: repertoire.name, songCount: winners.length });
}
