import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { songProposals, songs, songVersions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';
import { parseBody } from '@/app/_lib/validate';

const patchSchema = z.object({
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
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
  const { action, notes } = parsed.data;

  const [proposal] = await db.select().from(songProposals)
    .where(eq(songProposals.id, proposalId)).limit(1);
  if (!proposal) return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 });
  if (proposal.status !== 'pending') {
    return NextResponse.json({ error: 'Proposta já processada' }, { status: 409 });
  }

  if (action === 'approve') {
    const [version] = await db
      .insert(songVersions)
      .values({ songId: proposal.songId, content: proposal.content, createdBy: proposal.proposedBy })
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
