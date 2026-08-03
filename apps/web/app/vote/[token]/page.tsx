import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { votingRounds, votingCandidates, votingBallots, votingGuestBallots, groups, importedSongs } from '@/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { LogoMark, Wordmark } from '@/components/brand/Logo';
import { VotePanel } from './VotePanel';
import { auth } from '@/auth';
import { getGroupRole } from '@/app/_lib/groupAuth';

async function getVoteRound(token: string) {
  const [row] = await db
    .select({
      id: votingRounds.id,
      groupId: votingRounds.groupId,
      title: votingRounds.title,
      status: votingRounds.status,
      groupName: groups.name,
    })
    .from(votingRounds)
    .innerJoin(groups, eq(groups.id, votingRounds.groupId))
    .where(eq(votingRounds.inviteToken, token))
    .limit(1);

  if (!row) return null;

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
    })
    .from(votingCandidates)
    .leftJoin(importedSongs, eq(importedSongs.id, votingCandidates.importedSongId))
    .where(eq(votingCandidates.votingRoundId, row.id))
    .orderBy(asc(votingCandidates.createdAt));

  return { row, candidates };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getVoteRound(token);
  if (!data) return { title: 'Votação · Musilista' };
  return {
    title: `${data.row.title} · ${data.row.groupName}`,
    description: `Vote nas músicas de "${data.row.title}"`,
  };
}

export default async function VotePublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getVoteRound(token);
  if (!data) notFound();

  // Quem já é do grupo não precisa votar como convidado anônimo — manda
  // direto pra votação autenticada (evita voto duplicado sob outro nome).
  const session = await auth();
  if (session?.user?.id) {
    const role = await getGroupRole(session.user.id, data.row.groupId);
    if (role) redirect(`/groups/${data.row.groupId}`);
  }

  return (
    <main className="min-h-screen bg-bg pb-20 text-ink">
      <div className="border-b border-line bg-surface px-5 py-4">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <LogoMark size={22} />
          <Wordmark className="text-xs" />
          <span className="text-line">·</span>
          <span className="text-[13px] text-muted">{data.row.groupName}</span>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 pt-8">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Votação</p>
        <h1 className="mb-6 text-2xl font-bold leading-tight tracking-tight text-ink">{data.row.title}</h1>

        <VotePanel
          token={token}
          round={{ id: data.row.id, status: data.row.status as 'open' | 'closed' }}
          initialCandidates={data.candidates}
        />
      </div>

      <div className="mx-auto mt-12 max-w-xl border-t border-line px-5 pt-5 text-center font-mono text-[11px] text-faint">
        Criado com{' '}
        <a href="/" className="text-accent">
          Musilista
        </a>
      </div>
    </main>
  );
}
