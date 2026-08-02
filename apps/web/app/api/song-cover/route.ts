import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { songCovers } from '@/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import {
  normalize,
  blobRedirectResponse,
  sourceRedirectResponse,
  notFoundResponse,
} from '@/app/_lib/mediaCache';

type DeezerTrack = {
  title?: string;
  title_short?: string;
  artist?: { name?: string };
  album?: { cover_big?: string };
};

// Busca pública na Deezer, sem custo de Blob nenhum — pode ser repetida à
// vontade por quem perde a corrida do claim() abaixo.
async function findCoverUrl(title: string, normalizedTitle: string, normalizedArtist: string): Promise<string | null> {
  const searchRes = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(title)}&limit=25`);
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const results: DeezerTrack[] = searchData?.data ?? [];
  const byArtist = results.filter((r) => normalize(r.artist?.name ?? '') === normalizedArtist);
  // Entre as músicas do artista certo, prioriza título exatamente igual
  // (evita pegar a capa de uma versão "Ao Vivo"/remix quando existe a original).
  const exact = byArtist.find((r) => normalize(r.title ?? '') === normalizedTitle || normalize(r.title_short ?? '') === normalizedTitle);
  const match = exact ?? byArtist[0];
  return match?.album?.cover_big ?? null;
}

// Coleta a capa do álbum de uma música uma única vez (busca pública da Deezer)
// e guarda no Vercel Blob — visitas seguintes só redirecionam pra lá. Sem
// capa (bastante comum: cover/ao vivo/artista local sem catálogo lá), quem
// chama trata o 404 e cai pra foto do artista. O Postgres guarda só a URL
// (blobUrl), não os bytes — isso já encheu o banco antes.
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')?.trim();
  const artist = req.nextUrl.searchParams.get('artist')?.trim();
  if (!title || !artist) return new NextResponse(null, { status: 404 });

  const normalizedTitle = normalize(title);
  const normalizedArtist = normalize(artist);
  const key = `${normalizedTitle}::${normalizedArtist}`;

  const [cached] = await db
    .select({ blobUrl: songCovers.blobUrl })
    .from(songCovers)
    .where(and(eq(songCovers.normalizedKey, key), isNotNull(songCovers.blobUrl)))
    .limit(1);
  if (cached?.blobUrl) return blobRedirectResponse(cached.blobUrl);

  // Reivindica a chave antes de subir qualquer coisa pro Blob — evita que N
  // requisições concorrentes pra mesma música (ex: prévia de link
  // compartilhado abrindo em vários WhatsApp ao mesmo tempo) façam N
  // uploads da mesma imagem. Só quem ganha a corrida sobe pro Blob; quem
  // perde só redireciona pra fonte, sem gastar cota (já estourou por causa
  // disso: ~2,6 mil imagens levaram ~23 uploads cada em poucos dias).
  const [claimed] = await db
    .insert(songCovers)
    .values({ normalizedKey: key, title, artist })
    .onConflictDoNothing({ target: songCovers.normalizedKey })
    .returning({ id: songCovers.id });

  let won = Boolean(claimed);
  if (!won) {
    // Ninguém ganhou ainda, mas o "dono" pode ter travado/crashado no meio
    // do caminho (timeout de função, erro não tratado) — sem essa checagem
    // a reserva ficaria presa pra sempre. Reivindica de novo se já passou
    // tempo suficiente pra não ser mais uma corrida legítima.
    const [reclaimed] = await db
      .update(songCovers)
      .set({ claimedAt: sql`now()` })
      .where(and(
        eq(songCovers.normalizedKey, key),
        sql`${songCovers.blobUrl} is null`,
        sql`${songCovers.claimedAt} < now() - interval '30 seconds'`,
      ))
      .returning({ id: songCovers.id });
    won = Boolean(reclaimed);
  }

  if (!won) {
    const url = await findCoverUrl(title, normalizedTitle, normalizedArtist).catch(() => null);
    return url ? sourceRedirectResponse(url) : notFoundResponse();
  }

  try {
    const sourceUrl = await findCoverUrl(title, normalizedTitle, normalizedArtist);
    if (!sourceUrl) {
      await db.delete(songCovers).where(eq(songCovers.normalizedKey, key));
      return notFoundResponse();
    }

    const imgRes = await fetch(sourceUrl);
    if (!imgRes.ok) {
      await db.delete(songCovers).where(eq(songCovers.normalizedKey, key));
      return notFoundResponse();
    }

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = contentType.includes('png') ? 'png' : 'jpg';

    try {
      const { url: blobUrl } = await put(`song-covers/${key.replace(/[^a-z0-9]/gi, '-')}.${ext}`, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      await db.update(songCovers)
        .set({ blobUrl, contentType, sourceUrl })
        .where(eq(songCovers.normalizedKey, key));

      return blobRedirectResponse(blobUrl);
    } catch {
      // Blob fora do ar/com cota estourada não pode significar "sem imagem"
      // pro usuário — a imagem existe, só não conseguimos cachear agora.
      // Libera a reserva pra tentar cachear de novo numa próxima visita.
      await db.delete(songCovers).where(eq(songCovers.normalizedKey, key));
      return sourceRedirectResponse(sourceUrl);
    }
  } catch {
    await db.delete(songCovers).where(eq(songCovers.normalizedKey, key));
    return notFoundResponse();
  }
}
