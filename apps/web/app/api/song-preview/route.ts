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
async function findTrack(title: string, normalizedTitle: string, normalizedArtist: string): Promise<{ url: string | null; deezerId: string | null }> {
  const searchRes = await fetch(`https://api.deezer.com/search/track?q=${encodeURIComponent(title)}&limit=25`);
  if (!searchRes.ok) return { url: null, deezerId: null };
  const searchData = await searchRes.json();
  const results: DeezerTrack[] = searchData?.data ?? [];
  const byArtist = results.filter((r) => normalize(r.artist?.name ?? '') === normalizedArtist);
  const exact = byArtist.find((r) => normalize(r.title ?? '') === normalizedTitle || normalize(r.title_short ?? '') === normalizedTitle);
  const match = exact ?? byArtist[0];
  return { url: match?.preview ?? null, deezerId: match?.id ? String(match.id) : null };
}

// A URL do preview vem assinada com expiração curta (parâmetro `exp` na
// query) — não dá pra cachear ela direto, expira sozinha depois de um
// tempo e o áudio simplesmente para de carregar. O que cacheamos de
// verdade é o ID da faixa (estável); a cada visita resolve uma URL nova
// e fresca a partir dele — chamada leve, sem busca de novo.
async function resolveFreshUrl(deezerId: string): Promise<string | null> {
  const res = await fetch(`https://api.deezer.com/track/${deezerId}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.preview ?? null;
}

// Trecho de 30s pra lembrar a música antes de dar a nota — não precisa de
// conta nem chave de API (busca pública da Deezer), e não re-hospeda nada:
// o navegador toca direto da CDN deles. Rota pública (sem auth) porque o
// convidado sem login também usa (página /vote/[token]).
export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get('title')?.trim();
  const artist = req.nextUrl.searchParams.get('artist')?.trim();
  if (!title) return NextResponse.json({ previewUrl: null });

  const normalizedTitle = normalize(title);
  const normalizedArtist = normalize(artist ?? '');
  const key = `${normalizedTitle}::${normalizedArtist}`;

  const [cached] = await db.select({ deezerTrackId: songPreviews.deezerTrackId })
    .from(songPreviews).where(eq(songPreviews.normalizedKey, key)).limit(1);

  if (cached) {
    // Já buscamos essa música antes; sem ID = confirmado que não existe no
    // catálogo deles, não repete a busca à toa.
    if (!cached.deezerTrackId) return NextResponse.json({ previewUrl: null });
    const url = await resolveFreshUrl(cached.deezerTrackId).catch(() => null);
    return NextResponse.json({ previewUrl: url }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const { url, deezerId } = await findTrack(title, normalizedTitle, normalizedArtist).catch(() => ({ url: null, deezerId: null }));

  await db.insert(songPreviews)
    .values({ normalizedKey: key, title, artist: artist ?? '', deezerTrackId: deezerId })
    .onConflictDoNothing({ target: songPreviews.normalizedKey });

  return NextResponse.json({ previewUrl: url }, { headers: { 'Cache-Control': 'no-store' } });
}
