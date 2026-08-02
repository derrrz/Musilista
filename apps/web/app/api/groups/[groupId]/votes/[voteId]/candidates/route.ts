import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { votingRounds, votingCandidates, importedSongs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireGroupMember } from '@/app/_lib/groupAuth';
import { normalize } from '@/app/_lib/mediaCache';

type Ctx = { params: Promise<{ groupId: string; voteId: string }> };

// Qualquer membro pode sugerir uma música pra rodada — é a parte
// "colaborativa" da votação. Evita duplicata pelo título+artista
// normalizado (não trava por maiúscula/acento/espaço).
export async function POST(req: NextRequest, { params }: Ctx) {
  const { groupId, voteId } = await params;
  const membership = await requireGroupMember(groupId);
  if (membership instanceof NextResponse) return membership;
  const { userId } = membership;

  const [round] = await db.select().from(votingRounds)
    .where(and(eq(votingRounds.id, voteId), eq(votingRounds.groupId, groupId))).limit(1);
  if (!round) return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });
  if (round.status !== 'open') return NextResponse.json({ error: 'Votação encerrada' }, { status: 400 });

  const { title, artist, importedSongId, body } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });

  const normTitle = normalize(title);
  const normArtist = normalize(artist ?? '');
  const existing = await db.select({ title: votingCandidates.title, artist: votingCandidates.artist })
    .from(votingCandidates).where(eq(votingCandidates.votingRoundId, voteId));
  if (existing.some((c) => normalize(c.title) === normTitle && normalize(c.artist) === normArtist)) {
    return NextResponse.json({ error: 'Essa música já está na lista' }, { status: 409 });
  }

  // Se veio da busca no acervo, confirma que o id existe (senão ignora —
  // segue como sugestão em texto livre, sem link pra cifra).
  let song: { id: string; artistSlug: string | null; titleSlug: string | null } | undefined;
  if (importedSongId) {
    [song] = await db
      .select({ id: importedSongs.id, artistSlug: importedSongs.artistSlug, titleSlug: importedSongs.titleSlug })
      .from(importedSongs).where(eq(importedSongs.id, importedSongId)).limit(1);
  }

  const [candidate] = await db.insert(votingCandidates).values({
    votingRoundId: voteId,
    title: title.trim(),
    artist: (artist ?? '').trim(),
    importedSongId: song?.id,
    body: typeof body === 'string' && body.trim() ? body.trim() : null,
    addedBy: userId,
  }).returning();

  return NextResponse.json({
    ...candidate,
    artistSlug: song?.artistSlug ?? null,
    titleSlug: song?.titleSlug ?? null,
    votes: 0,
    myLevel: null,
  }, { status: 201 });
}
