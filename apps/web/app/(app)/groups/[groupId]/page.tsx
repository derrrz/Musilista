import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import {
  groups, groupMembers, events, eventRoles, eventAcknowledgments,
  users, repertoires, eventRepertoires, userProfiles,
  votingRounds, votingCandidates, votingBallots, importedSongs,
} from '@/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { GroupDetail } from './GroupDetail';
import { normalize } from '@/app/_lib/mediaCache';
import type { Capability } from './_components/types';

// Agrega o que os membros declararam no perfil num mapa de capacidades do
// grupo: cada função/instrumento/competência conta quantos membros a têm.
function aggregateCapabilities(
  profiles: { functions: string[] | null; instruments: string[] | null; competencies: string[] | null }[],
): Capability[] {
  const tally = new Map<string, Capability>();
  const add = (label: string, category: Capability['category']) => {
    const key = `${category}|${label.toLowerCase()}`;
    const cur = tally.get(key);
    if (cur) cur.count++;
    else tally.set(key, { label, category, count: 1 });
  };
  for (const p of profiles) {
    for (const f of p.functions ?? []) add(f, 'function');
    for (const i of p.instruments ?? []) add(i, 'instrument');
    for (const c of p.competencies ?? []) add(c, 'competency');
  }
  return [...tally.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 40);
}

// Sugestões de música da votação (rodadas abertas e fechadas) também entram
// no mapa do grupo: count = total de votos recebidos, somando entre rodadas
// quando a mesma música foi sugerida mais de uma vez (dedupe por acervo
// quando bateu, senão por título+artista normalizado). Só entram sugestões
// com pelo menos 1 voto — sem voto não expressa nada sobre o grupo ainda.
function aggregateSuggestions(
  rows: { title: string; artist: string; importedSongId: string | null; artistSlug: string | null; titleSlug: string | null; votes: number }[],
): Capability[] {
  const tally = new Map<string, Capability & { key: string }>();
  for (const r of rows) {
    if (r.votes <= 0) continue;
    const key = r.importedSongId ?? `${normalize(r.title)}|${normalize(r.artist)}`;
    const cur = tally.get(key);
    if (cur) {
      cur.count += r.votes;
    } else {
      tally.set(key, {
        key,
        label: r.title,
        category: 'suggestion',
        count: r.votes,
        href: r.artistSlug && r.titleSlug ? `/${r.artistSlug}/${r.titleSlug}` : undefined,
      });
    }
  }
  return [...tally.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 40)
    .map(({ key: _key, ...c }) => c);
}

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { groupId } = await params;
  const userId = session.user.id;

  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);

  if (!membership) redirect('/groups');

  const [group] = await db
    .select({ id: groups.id, name: groups.name, description: groups.description, inviteCode: groups.inviteCode, image: groups.image })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) redirect('/groups');

  const [{ memberCount }] = await db
    .select({ memberCount: count() })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  const members = await db
    .select({
      userId: groupMembers.userId,
      name: users.name,
      email: users.email,
      image: users.image,
      role: groupMembers.role,
      functions: userProfiles.functions,
      instruments: userProfiles.instruments,
      competencies: userProfiles.competencies,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(groupMembers.joinedAt);

  const suggestionRows = await db
    .select({
      title: votingCandidates.title,
      artist: votingCandidates.artist,
      importedSongId: votingCandidates.importedSongId,
      artistSlug: importedSongs.artistSlug,
      titleSlug: importedSongs.titleSlug,
      votes: sql<number>`count(${votingBallots.userId})::int`,
    })
    .from(votingCandidates)
    .innerJoin(votingRounds, eq(votingRounds.id, votingCandidates.votingRoundId))
    .leftJoin(votingBallots, eq(votingBallots.candidateId, votingCandidates.id))
    .leftJoin(importedSongs, eq(importedSongs.id, votingCandidates.importedSongId))
    .where(eq(votingRounds.groupId, groupId))
    .groupBy(votingCandidates.id, importedSongs.artistSlug, importedSongs.titleSlug);

  const capabilities = [...aggregateCapabilities(members), ...aggregateSuggestions(suggestionRows)];

  const eventsRows = await db
    .select({
      id: events.id,
      title: events.title,
      eventDate: events.eventDate,
      eventTime: events.eventTime,
      eventType: events.eventType,
      notice: events.notice,
      location: events.location,
      publicToken: events.publicToken,
      repertoireId: events.repertoireId,
    })
    .from(events)
    .where(eq(events.groupId, groupId))
    .orderBy(events.eventDate);

  const enrichedEvents = await Promise.all(
    eventsRows.map(async (ev) => {
      const [rolesRows, ackRows, repsRows] = await Promise.all([
        db
          .select({ id: eventRoles.id, roleName: eventRoles.roleName, userId: eventRoles.userId, userName: users.name })
          .from(eventRoles)
          .leftJoin(users, eq(eventRoles.userId, users.id))
          .where(eq(eventRoles.eventId, ev.id)),
        db
          .select({ userId: eventAcknowledgments.userId })
          .from(eventAcknowledgments)
          .where(eq(eventAcknowledgments.eventId, ev.id)),
        db
          .select({ repertoireId: eventRepertoires.repertoireId, name: repertoires.name })
          .from(eventRepertoires)
          .leftJoin(repertoires, eq(eventRepertoires.repertoireId, repertoires.id))
          .where(eq(eventRepertoires.eventId, ev.id)),
      ]);

      return {
        ...ev,
        roles: rolesRows,
        acknowledgedCount: ackRows.length,
        userAcknowledged: ackRows.some((a) => a.userId === userId),
        repertoireLinks: repsRows,
      };
    }),
  );

  const roleMap: Record<string, string> = { owner: 'DONO', admin: 'ADMIN', member: 'MEMBRO' };

  return (
    <GroupDetail
      group={{ ...group, myRole: roleMap[membership.role] ?? 'MEMBRO', memberCount }}
      events={enrichedEvents}
      members={members.map(({ userId: uid, name, email, image, role }) => ({ userId: uid, name, email, image, role }))}
      capabilities={capabilities}
      myUserId={userId}
    />
  );
}
