import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { artistPhotos } from '@/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import {
  normalize,
  blobRedirectResponse,
  sourceRedirectResponse,
  notFoundResponse,
} from '@/app/_lib/mediaCache';

// Busca pública na Deezer, sem custo de Blob nenhum — pode ser repetida à
// vontade por quem perde a corrida do claim() abaixo.
async function findPhotoUrl(name: string, normalizedName: string): Promise<string | null> {
  const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`);
  if (!searchRes.ok) return null;
  const searchData = await searchRes.json();
  const results: Array<{ name?: string; picture_xl?: string }> = searchData?.data ?? [];
  // Busca da Deezer é "fuzzy" e pode devolver um artista diferente com nome parecido
  // (ex: "A Dominique" → "Dominique A") — só aceita se o nome bater de verdade.
  const match = results.find((r) => normalize(r.name ?? '') === normalizedName);
  return match?.picture_xl ?? null;
}

// Coleta a foto do artista uma única vez (busca pública da Deezer, sem chave/login)
// e guarda no Vercel Blob — visitas seguintes só redirecionam pra lá, sem
// depender da Deezer no ar nem repetir a busca externa. O Postgres guarda só
// a URL (blobUrl), não os bytes — isso já encheu o banco antes.
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name) return new NextResponse(null, { status: 404 });

  const normalizedName = normalize(name);

  const [cached] = await db
    .select({ blobUrl: artistPhotos.blobUrl })
    .from(artistPhotos)
    .where(and(eq(artistPhotos.normalizedName, normalizedName), isNotNull(artistPhotos.blobUrl)))
    .limit(1);
  if (cached?.blobUrl) return blobRedirectResponse(cached.blobUrl);

  // Reivindica a chave antes de subir qualquer coisa pro Blob — evita que N
  // requisições concorrentes pro mesmo artista (ex: prévia de link
  // compartilhado abrindo em vários WhatsApp ao mesmo tempo) façam N
  // uploads da mesma imagem. Só quem ganha a corrida sobe pro Blob; quem
  // perde só redireciona pra fonte, sem gastar cota (já estourou por causa
  // disso: ~2,6 mil imagens levaram ~23 uploads cada em poucos dias).
  const [claimed] = await db
    .insert(artistPhotos)
    .values({ normalizedName, artistName: name })
    .onConflictDoNothing({ target: artistPhotos.normalizedName })
    .returning({ id: artistPhotos.id });

  let won = Boolean(claimed);
  if (!won) {
    // Ninguém ganhou ainda, mas o "dono" pode ter travado/crashado no meio
    // do caminho (timeout de função, erro não tratado) — sem essa checagem
    // a reserva ficaria presa pra sempre. Reivindica de novo se já passou
    // tempo suficiente pra não ser mais uma corrida legítima.
    const [reclaimed] = await db
      .update(artistPhotos)
      .set({ claimedAt: sql`now()` })
      .where(and(
        eq(artistPhotos.normalizedName, normalizedName),
        sql`${artistPhotos.blobUrl} is null`,
        sql`${artistPhotos.claimedAt} < now() - interval '30 seconds'`,
      ))
      .returning({ id: artistPhotos.id });
    won = Boolean(reclaimed);
  }

  if (!won) {
    const url = await findPhotoUrl(name, normalizedName).catch(() => null);
    return url ? sourceRedirectResponse(url) : notFoundResponse();
  }

  try {
    const sourceUrl = await findPhotoUrl(name, normalizedName);
    if (!sourceUrl) {
      await db.delete(artistPhotos).where(eq(artistPhotos.normalizedName, normalizedName));
      return notFoundResponse();
    }

    const imgRes = await fetch(sourceUrl);
    if (!imgRes.ok) {
      await db.delete(artistPhotos).where(eq(artistPhotos.normalizedName, normalizedName));
      return notFoundResponse();
    }

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = contentType.includes('png') ? 'png' : 'jpg';

    try {
      const { url: blobUrl } = await put(`artist-photos/${normalizedName.replace(/[^a-z0-9]/gi, '-')}.${ext}`, buffer, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      await db.update(artistPhotos)
        .set({ blobUrl, contentType, sourceUrl })
        .where(eq(artistPhotos.normalizedName, normalizedName));

      return blobRedirectResponse(blobUrl);
    } catch {
      // Blob fora do ar/com cota estourada não pode significar "sem imagem"
      // pro usuário — a imagem existe, só não conseguimos cachear agora.
      // Libera a reserva pra tentar cachear de novo numa próxima visita.
      await db.delete(artistPhotos).where(eq(artistPhotos.normalizedName, normalizedName));
      return sourceRedirectResponse(sourceUrl);
    }
  } catch {
    await db.delete(artistPhotos).where(eq(artistPhotos.normalizedName, normalizedName));
    return notFoundResponse();
  }
}
