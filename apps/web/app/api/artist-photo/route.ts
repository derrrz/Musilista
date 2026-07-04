import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { artistPhotos } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { normalize, blobRedirectResponse, notFoundResponse } from '@/app/_lib/mediaCache';

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

  try {
    const searchRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=5`);
    if (!searchRes.ok) return notFoundResponse();

    const searchData = await searchRes.json();
    const results: Array<{ name?: string; picture_xl?: string }> = searchData?.data ?? [];
    // Busca da Deezer é "fuzzy" e pode devolver um artista diferente com nome parecido
    // (ex: "A Dominique" → "Dominique A") — só aceita se o nome bater de verdade.
    const match = results.find((r) => normalize(r.name ?? '') === normalizedName);
    if (!match?.picture_xl) return notFoundResponse();

    const imgRes = await fetch(match.picture_xl);
    if (!imgRes.ok) return notFoundResponse();

    const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const ext = contentType.includes('png') ? 'png' : 'jpg';

    const { url } = await put(`artist-photos/${normalizedName.replace(/[^a-z0-9]/gi, '-')}.${ext}`, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    await db.insert(artistPhotos).values({
      normalizedName,
      artistName: name,
      blobUrl: url,
      contentType,
      sourceUrl: match.picture_xl,
    }).onConflictDoUpdate({
      target: artistPhotos.normalizedName,
      set: { blobUrl: url, contentType, sourceUrl: match.picture_xl },
    });

    return blobRedirectResponse(url);
  } catch {
    return notFoundResponse();
  }
}
