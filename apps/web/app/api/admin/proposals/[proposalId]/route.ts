import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { songProposals, songs, songVersions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';
import { parseBody } from '@/app/_lib/validate';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const user = await getAuthUser();
  if (!user || !TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { proposalId } = await params;

  const [row] = await db
    .select({
      id: songProposals.id,
      status: songProposals.status,
      proposedAt: songProposals.proposedAt,
      notes: songProposals.notes,
      content: songProposals.content,
      songId: songs.id,
      title: songs.title,
      artist: songs.artist,
      canonicalVersionId: songs.canonicalVersionId,
      proposerName: users.name,
      proposerEmail: users.email,
    })
    .from(songProposals)
    .innerJoin(songs, eq(songProposals.songId, songs.id))
    .innerJoin(users, eq(songProposals.proposedBy, users.id))
    .where(eq(songProposals.id, proposalId))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });

  let canonicalContent: string | null = null;
  if (row.canonicalVersionId) {
    const [version] = await db
      .select({ content: songVersions.content })
      .from(songVersions)
      .where(eq(songVersions.id, row.canonicalVersionId))
      .limit(1);
    canonicalContent = version?.content ?? null;
  }

  return NextResponse.json({
    id: row.id,
    status: row.status,
    proposedAt: row.proposedAt,
    notes: row.notes,
    content: row.content,
    songId: row.songId,
    title: row.title,
    artist: row.artist,
    proposerName: row.proposerName,
    proposerEmail: row.proposerEmail,
    canonicalContent,
  });
}

const patchSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
  content: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const user = await getAuthUser();
  if (!user || !TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { proposalId } = await params;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;
  const { action, notes, content } = parsed.data;

  const [proposal] = await db.select().from(songProposals)
    .where(eq(songProposals.id, proposalId)).limit(1);
  if (!proposal) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
  if (proposal.status !== 'pending') {
    return NextResponse.json({ error: 'Proposta já processada' }, { status: 409 });
  }

  if (action === 'approve') {
    // Se o admin editou o conteúdo na revisão, é a versão editada que vira
    // canônica — não a proposta original sem correção.
    const [version] = await db
      .insert(songVersions)
      .values({ songId: proposal.songId, content: content ?? proposal.content, createdBy: proposal.proposedBy })
      .returning();
    await db.update(songs).set({ canonicalVersionId: version.id }).where(eq(songs.id, proposal.songId));
  }

  await db
    .update(songProposals)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
      notes: notes ?? null,
    })
    .where(eq(songProposals.id, proposalId));

  return NextResponse.json({ ok: true });
}
