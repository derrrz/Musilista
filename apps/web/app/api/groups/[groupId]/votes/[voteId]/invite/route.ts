import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://musilista.vercel.app');

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

// Gera (ou regenera, invalidando o link anterior) o token de convite dessa
// rodada. Não mexe em status — abrir/fechar continua 100% manual, sem
// nenhuma trava de aceite.
export async function POST(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  if (!isManager(membership.role)) return NextResponse.json({ error: 'Só quem administra o grupo pode gerar convite' }, { status: 403 });

  const [round] = await db.select({ id: votingRounds.id }).from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const token = crypto.randomUUID();
  await db.update(votingRounds).set({ inviteToken: token }).where(eq(votingRounds.id, voteId));

  return NextResponse.json({ url: `${APP_URL}/vote/${token}` });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  if (!isManager(membership.role)) return NextResponse.json({ error: 'Só quem administra o grupo pode revogar convite' }, { status: 403 });

  await db.update(votingRounds).set({ inviteToken: null })
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId)));

  return new NextResponse(null, { status: 204 });
}
