import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { events, groups, eventRoles, groupMembers, users, repertoires, repertoireSongs, songs, groupSongs } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const [row] = await db
    .select({
      eventId: events.id,
      title: events.title,
      eventDate: events.eventDate,
      eventTime: events.eventTime,
      location: events.location,
      eventType: events.eventType,
      notice: events.notice,
      technicalRider: events.technicalRider,
      repertoireId: events.repertoireId,
      groupId: groups.id,
      groupName: groups.name,
      groupImage: groups.image,
    })
    .from(events)
    .innerJoin(groups, eq(groups.id, events.groupId))
    .where(eq(events.publicToken, token))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const roles = await db
    .select({
      label: eventRoles.roleName,
      assigneeName: users.name,
    })
    .from(eventRoles)
    .leftJoin(users, eq(users.id, eventRoles.userId))
    .where(eq(eventRoles.eventId, row.eventId));

  const members = await db
    .select({ name: users.name, image: users.image })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, row.groupId));

  let setlist: { name: string; songs: { title: string; artist: string; key: string | null }[] } | null = null;
  if (row.repertoireId) {
    const [rep] = await db
      .select({ name: repertoires.name })
      .from(repertoires)
      .where(eq(repertoires.id, row.repertoireId))
      .limit(1);

    if (rep) {
      const items = await db
        .select({
          title: sql<string>`coalesce(${repertoireSongs.title}, ${songs.title}, ${groupSongs.title})`,
          artist: sql<string>`coalesce(${songs.artist}, ${groupSongs.artist}, '')`,
          key: repertoireSongs.songKey,
        })
        .from(repertoireSongs)
        .leftJoin(songs, eq(songs.id, repertoireSongs.songId))
        .leftJoin(groupSongs, eq(groupSongs.id, repertoireSongs.groupSongId))
        .where(eq(repertoireSongs.repertoireId, row.repertoireId))
        .orderBy(asc(repertoireSongs.position));

      setlist = { name: rep.name, songs: items };
    }
  }

  return NextResponse.json({
    event: {
      title: row.title,
      eventDate: row.eventDate,
      eventTime: row.eventTime,
      location: row.location,
      eventType: row.eventType,
      notice: row.notice,
      technicalRider: row.technicalRider,
    },
    group: {
      name: row.groupName,
      image: row.groupImage,
    },
    roles,
    members,
    setlist,
  });
}
