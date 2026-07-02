import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { songs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ songId: string }> },
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'ceo') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { songId } = await params;

  const song = await db.query.songs.findFirst({ where: eq(songs.id, songId) });
  if (!song) return NextResponse.json({ error: 'Música não encontrada' }, { status: 404 });

  await db.delete(songs).where(eq(songs.id, songId));

  return NextResponse.json({ ok: true });
}
