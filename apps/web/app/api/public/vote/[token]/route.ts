import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots, votingGuestBallots, votingGuestInvites, groups, importedSongs } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';

type Ctx = { params: Promise<{ token: string }> };

// Sem auth — o token é a credencial. Convidado só acessa essa rodada
// específica, nunca o grupo (nome/logo do grupo é só decoração, sem link
// pra mais nada).
export async function GET(req: NextRequest, { params }: Ctx) {
  const { token } = await params;
  const guestId = req.nextUrl.searchParams.get('guestId');
  const inviteId = req.nextUrl.searchParams.get('invite');

  const [row] = await db
    .select({
      id: votingRounds.id,
      title: votingRounds.title,
      status: votingRounds.status,
      groupName: groups.name,
      groupImage: groups.image,
    })
    .from(votingRounds)
    .innerJoin(groups, eq(groups.id, votingRounds.groupId))
    .where(eq(votingRounds.inviteToken, token))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let invitedName: string | null = null;
  if (inviteId) {
    const [invite] = await db.select({ name: votingGuestInvites.name }).from(votingGuestInvites)
      .where(eq(votingGuestInvites.id, inviteId)).limit(1);
    invitedName = invite?.name ?? null;
  }

  const votesExpr = sql<number>`
    coalesce((select sum(${votingBallots.level}) from ${votingBallots} where ${votingBallots.candidateId} = ${votingCandidates.id}), 0)
    + coalesce((select sum(${votingGuestBallots.level}) from ${votingGuestBallots} where ${votingGuestBallots.candidateId} = ${votingCandidates.id}), 0)
  `;

  const candidates = await db
    .select({
      id: votingCandidates.id,
      title: votingCandidates.title,
      artist: votingCandidates.artist,
      body: votingCandidates.body,
      artistSlug: importedSongs.artistSlug,
      titleSlug: importedSongs.titleSlug,
      votes: votesExpr.mapWith(Number),
      myLevel: guestId
        ? sql<number | null>`(select ${votingGuestBallots.level} from ${votingGuestBallots} where ${votingGuestBallots.candidateId} = ${votingCandidates.id} and ${votingGuestBallots.guestId} = ${guestId})`
        : sql<number | null>`null`,
    })
    .from(votingCandidates)
    .leftJoin(importedSongs, eq(importedSongs.id, votingCandidates.importedSongId))
    .where(eq(votingCandidates.votingRoundId, row.id))
    // ordem estável (não pelo placar) — a sessão guiada usa essa ordem
    // direto, sem embaralhar conforme os votos mudam.
    .orderBy(asc(votingCandidates.createdAt));

  return NextResponse.json({
    round: { id: row.id, title: row.title, status: row.status },
    group: { name: row.groupName, image: row.groupImage },
    invitedName,
    candidates,
  });
}
