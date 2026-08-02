import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingGuestInvites } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireGroupMember, isManager } from '@/app/_lib/groupAuth';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://musilista.vercel.app');

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

// Lista os convites nomeados já criados dessa rodada (nome + se já votou).
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  if (!isManager(membership.role)) return NextResponse.json({ error: 'Só quem administra o grupo pode ver os convites' }, { status: 403 });

  const [round] = await db.select({ id: votingRounds.id, inviteToken: votingRounds.inviteToken }).from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  const invites = await db.select().from(votingGuestInvites)
    .where(eq(votingGuestInvites.votingRoundId, voteId))
    .orderBy(desc(votingGuestInvites.createdAt));

  return NextResponse.json(invites.map((i) => ({
    ...i,
    url: round.inviteToken ? `${APP_URL}/vote/${round.inviteToken}?invite=${i.id}` : null,
  })));
}

// Cria um convite nomeado — o dono já sabe quem vai mandar (ex: "Eder"),
// então o nome vem pré-preenchido e travado na página pública. Gera o
// token de convite da rodada automaticamente se ainda não existir, pra
// não obrigar um passo extra do "convidar por link genérico" antes.
export async function POST(req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  if (!isManager(membership.role)) return NextResponse.json({ error: 'Só quem administra o grupo pode criar convite' }, { status: 403 });

  const { name } = await req.json().catch(() => ({}));
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

  const [round] = await db.select({ id: votingRounds.id, inviteToken: votingRounds.inviteToken }).from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });

  let inviteToken = round.inviteToken;
  if (!inviteToken) {
    inviteToken = crypto.randomUUID();
    await db.update(votingRounds).set({ inviteToken }).where(eq(votingRounds.id, voteId));
  }

  const [invite] = await db.insert(votingGuestInvites).values({
    votingRoundId: voteId,
    name: name.trim(),
  }).returning();

  return NextResponse.json({
    ...invite,
    url: `${APP_URL}/vote/${inviteToken}?invite=${invite.id}`,
  }, { status: 201 });
}
