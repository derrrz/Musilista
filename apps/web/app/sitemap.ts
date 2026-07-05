import type { MetadataRoute } from 'next';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { asc, eq, sql } from 'drizzle-orm';

const BASE = 'https://www.musilista.com.br';
const SONGS_PER_SITEMAP = 40000;

// Regenera diariamente — o conteúdo é pré-renderizado no build, e um build
// pode rodar enquanto o acervo está sendo carregado (contagem parcial).
export const revalidate = 86400;

// id 0: estáticas + índice + artistas; ids 1..N: músicas principais em
// blocos de 40k (limite do Google é 50k URLs por arquivo).
export async function generateSitemaps() {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(importedSongs)
    .where(eq(importedSongs.versionSlug, ''));
  const chunks = Math.max(1, Math.ceil(row.n / SONGS_PER_SITEMAP));
  return Array.from({ length: chunks + 1 }, (_, id) => ({ id }));
}

export default async function sitemap({ id: rawId }: { id: Promise<number> | number }): Promise<MetadataRoute.Sitemap> {
  // No Next 16 o id chega como Promise (igual aos params de página) e, em
  // dev, resolve para string — parseInt cobre os dois casos.
  const id = parseInt(String(await rawId), 10);
  if (id === 0) {
    const artists = await db
      .selectDistinct({ artistSlug: importedSongs.artistSlug })
      .from(importedSongs)
      .orderBy(asc(importedSongs.artistSlug));
    const letters = ['0-9', ...'abcdefghijklmnopqrstuvwxyz'.split('')];
    return [
      { url: `${BASE}/`, changeFrequency: 'daily', priority: 1 },
      { url: `${BASE}/artistas`, changeFrequency: 'weekly', priority: 0.6 },
      ...letters.map((l) => ({ url: `${BASE}/artistas/${l}`, changeFrequency: 'weekly' as const, priority: 0.4 })),
      { url: `${BASE}/planos`, changeFrequency: 'monthly', priority: 0.3 },
      ...artists
        .filter((a) => a.artistSlug)
        .map((a) => ({ url: `${BASE}/${a.artistSlug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ];
  }

  const songs = await db
    .select({ artistSlug: importedSongs.artistSlug, titleSlug: importedSongs.titleSlug })
    .from(importedSongs)
    .where(eq(importedSongs.versionSlug, ''))
    .orderBy(asc(importedSongs.artistSlug), asc(importedSongs.titleSlug))
    .limit(SONGS_PER_SITEMAP)
    .offset((id - 1) * SONGS_PER_SITEMAP);

  return songs
    .filter((s) => s.artistSlug && s.titleSlug)
    .map((s) => ({
      url: `${BASE}/${s.artistSlug}/${s.titleSlug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));
}
