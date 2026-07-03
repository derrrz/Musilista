import { NextResponse } from 'next/server';
import { db } from '@/db';
import { songProposals, songs, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';

export async function GET() {
  const user = await getAuthUser();
  if (!user || !TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db
    .select({
      id: songProposals.id,
      status: songProposals.status,
      proposedAt: songProposals.proposedAt,
      notes: songProposals.notes,
      songId: songs.id,
      title: songs.title,
      artist: songs.artist,
      proposerName: users.name,
      proposerEmail: users.email,
    })
    .from(songProposals)
    .innerJoin(songs, eq(songProposals.songId, songs.id))
    .innerJoin(users, eq(songProposals.proposedBy, users.id))
    .where(eq(songProposals.status, 'pending'))
    .orderBy(desc(songProposals.proposedAt));

  return NextResponse.json(rows);
}
