import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';

// Rota temporária, admin-only: aplica a migration 0017 (imported_song_id em
// voting_candidates) direto em produção, já que a DATABASE_URL de prod é
// "Sensitive" na Vercel e não pode ser baixada por `vercel env pull` — só o
// próprio app rodando na infra da Vercel enxerga o valor real. Idempotente
// (IF NOT EXISTS / EXCEPTION), então rodar mais de uma vez não quebra nada.
// Remover depois de usada uma vez.
export async function POST() {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const before = await db.execute(sql`
    select column_name from information_schema.columns where table_name = 'voting_candidates'
  `);

  await db.execute(sql`ALTER TABLE "voting_candidates" ADD COLUMN IF NOT EXISTS "imported_song_id" uuid`);
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "voting_candidates"
        ADD CONSTRAINT "voting_candidates_imported_song_id_fkey"
        FOREIGN KEY ("imported_song_id") REFERENCES "public"."imported_songs"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);

  const after = await db.execute(sql`
    select column_name from information_schema.columns where table_name = 'voting_candidates'
  `);

  return NextResponse.json({
    before: before.rows.map((r) => r.column_name),
    after: after.rows.map((r) => r.column_name),
  });
}
