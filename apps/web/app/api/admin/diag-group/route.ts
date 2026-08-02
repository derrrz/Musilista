import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';

// Rota temporária, admin-only, só leitura: diagnóstico rápido de um grupo
// por nome (parcial, case-insensitive) — quantas rodadas de votação,
// candidatos, votos e referências ele tem. Remover depois de usada.
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const name = req.nextUrl.searchParams.get('name') ?? '';
  if (!name.trim()) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });

  const groupsRes = await db.execute(sql`
    select id, name from groups where name ilike ${`%${name}%`} limit 10
  `);

  const results = [];
  for (const g of groupsRes.rows as { id: string; name: string }[]) {
    const [rounds] = (
      await db.execute(sql`select count(*)::int as n from voting_rounds where group_id = ${g.id}`)
    ).rows as { n: number }[];
    const [candidates] = (
      await db.execute(sql`
        select count(*)::int as n from voting_candidates vc
        join voting_rounds vr on vr.id = vc.voting_round_id
        where vr.group_id = ${g.id}
      `)
    ).rows as { n: number }[];
    const [withLink] = (
      await db.execute(sql`
        select count(*)::int as n from voting_candidates vc
        join voting_rounds vr on vr.id = vc.voting_round_id
        where vr.group_id = ${g.id} and vc.imported_song_id is not null
      `)
    ).rows as { n: number }[];
    const [votes] = (
      await db.execute(sql`
        select count(*)::int as n from voting_ballots vb
        join voting_candidates vc on vc.id = vb.candidate_id
        join voting_rounds vr on vr.id = vc.voting_round_id
        where vr.group_id = ${g.id}
      `)
    ).rows as { n: number }[];
    const [references] = (
      await db.execute(sql`select count(*)::int as n from group_references where group_id = ${g.id}`)
    ).rows as { n: number }[];

    results.push({
      groupId: g.id,
      groupName: g.name,
      votingRounds: rounds.n,
      votingCandidates: candidates.n,
      candidatesWithCifraLink: withLink.n,
      totalVotesCast: votes.n,
      bandReferences: references.n,
    });
  }

  return NextResponse.json(results);
}
