import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { userSongs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

/** Apaga o rascunho pessoal do usuário para uma música, restaurando o estado canônico. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { songId } = await params;

  await db
    .update(userSongs)
    .set({ draft: null })
    .where(and(eq(userSongs.userId, user.id), eq(userSongs.songId, songId)));

  return NextResponse.json({ ok: true });
}
