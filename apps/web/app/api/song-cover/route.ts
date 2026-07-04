import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { songCovers } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { normalize, blobRedirectResponse, notFoundResponse } from '@/app/_lib/mediaCache';

type DeezerTrack = {
  title?: string;
  title_short?: string;
  artist?: { name?: string };
  album?: { cover_big?: string };
};

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

  try {
    // Buscar por artista+título juntos na Deezer costuma não achar nada — o
    // título sozinho tem bem mais alcance, e a gente filtra pelo artista aqui.
    const searchRes = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(title)}&limit=25`);
    if (!searchRes.ok) return notFoundResponse();

    const searchData = await searchRes.json();
    const results: DeezerTrack[] = searchData?.data ?? [];
    const byArtist = results.filter((r) => normalize(r.artist?.name ?? '') === normalizedArtist);
    // Entre as músicas do artista certo, prioriza título exatamente igual
    // (evita pegar a capa de uma versão "Ao Vivo"/remix quando existe a original).
    const exact = byArtist.find((r) => normalize(r.title ?? '') === normalizedTitle || normalize(r.title_short ?? '') === normalizedTitle);
    const match = exact ?? byArtist[0];
    if (!match?.album?.cover_big) return notFoundResponse();

    const imgRes = await fetch(match.album.cover_big);
    if (!imgRes.ok) return notFoundResponse();

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = contentType.includes('png') ? 'png' : 'jpg';

    const { url } = await put(`song-covers/${key.replace(/[^a-z0-9]/gi, '-')}.${ext}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    await db.insert(songCovers).values({
      normalizedKey: key,
      title,
      artist,
      blobUrl: url,
      contentType,
      sourceUrl: match.album.cover_big,
    }).onConflictDoUpdate({
      target: songCovers.normalizedKey,
      set: { blobUrl: url, contentType, sourceUrl: match.album.cover_big },
    });

    return blobRedirectResponse(url);
  } catch {
    return notFoundResponse();
  }
}
