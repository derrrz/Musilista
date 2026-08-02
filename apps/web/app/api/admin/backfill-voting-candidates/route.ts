import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';

// Rota temporária, admin-only: sugestões de votação criadas antes da coluna
// imported_song_id existir (ver migration 0017) ficaram sem vínculo com o
// acervo, mesmo quando a música existe lá — não tinha onde salvar isso na
// hora. Casa por título+artista normalizado (unaccent/lower/trim), só match
// exato, contra a versão principal (version_slug='') de cada música. Não
// mexe em candidatos que já têm imported_song_id. Idempotente. Remover
// depois de usada.
export async function POST() {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [{ pending }] = (
    await db.execute(sql`
      select count(*)::int as pending from voting_candidates where imported_song_id is null
    `)
  ).rows as { pending: number }[];

  const matched = await db.execute(sql`
    update voting_candidates vc
    set imported_song_id = s.id
    from imported_songs s
    where vc.imported_song_id is null
      and s.version_slug = ''
      and unaccent(lower(trim(s.title))) = unaccent(lower(trim(vc.title)))
      and unaccent(lower(trim(s.artist))) = unaccent(lower(trim(vc.artist)))
    returning vc.id, vc.title, vc.artist
  `);

  const [{ stillPending }] = (
    await db.execute(sql`
      select count(*)::int as "stillPending" from voting_candidates where imported_song_id is null
    `)
  ).rows as { stillPending: number }[];

  return NextResponse.json({
    pendingBefore: pending,
    updated: matched.rows.length,
    updatedSample: matched.rows.slice(0, 20),
    stillPending,
  });
}
