import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { songPreviews } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalize } from '@/app/_lib/mediaCache';

type DeezerTrack = {
  id?: number;
  title?: string;
  title_short?: string;
  artist?: { name?: string };
  preview?: string;
};

// Mesma estratégia de busca do song-cover (Deezer, sem chave): título como
// termo de busca, filtra pelo artista normalizado, prioriza título exato
// pra não pegar cover/ao vivo/remix no lugar da versão certa.
async function findPreview(title: string, normalizedTitle: string, normalizedArtist: string): Promise<{ url: string | null; deezerId: string | null }> {
  const searchRes = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(title)}&limit=25`);
  if (!searchRes.ok) return { url: null, deezerId: null };
  const searchData = await searchRes.json();
  const results: DeezerTrack[] = searchData?.data ?? [];
  const byArtist = results.filter((r) => normalize(r.artist?.name ?? '') === normalizedArtist);
  const exact = byArtist.find((r) => normalize(r.title ?? '') === normalizedTitle || normalize(r.title_short ?? '') === normalizedTitle);
  const match = exact ?? byArtist[0];
  return { url: match?.preview ?? null, deezerId: match?.id ? String(match.id) : null };
}

// Trecho de 30s pra lembrar a música antes de dar a nota — não precisa de
// conta nem chave de API (busca pública da Deezer), e não re-hospeda nada:
// o navegador toca direto da CDN deles, só cacheamos a URL pra não repetir
// a busca. Rota pública (sem auth) porque o convidado sem login também usa
// (página /vote/[token]).
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')?.trim();
  const artist = req.nextUrl.searchParams.get('artist')?.trim();
  if (!title) return NextResponse.json({ previewUrl: null });

  const normalizedTitle = normalize(title);
  const normalizedArtist = normalize(artist ?? '');
  const key = `${normalizedTitle}::${normalizedArtist}`;

  const [cached] = await db.select({ previewUrl: songPreviews.previewUrl })
    .from(songPreviews).where(eq(songPreviews.normalizedKey, key)).limit(1);
  if (cached) {
    return NextResponse.json({ previewUrl: cached.previewUrl }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  }

  const { url, deezerId } = await findPreview(title, normalizedTitle, normalizedArtist).catch(() => ({ url: null, deezerId: null }));

  await db.insert(songPreviews)
    .values({ normalizedKey: key, title, artist: artist ?? '', previewUrl: url, deezerTrackId: deezerId })
    .onConflictDoNothing({ target: songPreviews.normalizedKey });

  return NextResponse.json({ previewUrl: url }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
