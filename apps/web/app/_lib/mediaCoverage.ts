import { db } from '@/db';
import { importedSongs, artistPhotos, songCovers } from '@/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { normalize } from './mediaCache';

export type CoverageStat = { covered: number; total: number };
export type MediaCoverage = { artists: CoverageStat; songs: CoverageStat };

// Comparação feita em JS (não em SQL) pra usar a mesma normalize() que as
// rotas de cache usam como chave — nomes com acento (comuns no catálogo,
// ex: "Legião Urbana") dariam falso "sem cobertura" se comparássemos direto
// com lower()/trim() puro do Postgres.
let cache: { data: MediaCoverage; exp: number } | null = null;

export async function mediaCoverage(): Promise<MediaCoverage> {
  if (cache && cache.exp > Date.now()) return cache.data;

  const catalogFilter = and(eq(importedSongs.status, 'published'), eq(importedSongs.versionSlug, ''));
  const [catalogRows, photoRows, coverRows] = await Promise.all([
    db.selectDistinct({ title: importedSongs.title, artist: importedSongs.artist }).from(importedSongs).where(catalogFilter),
    db.select({ normalizedName: artistPhotos.normalizedName }).from(artistPhotos).where(isNotNull(artistPhotos.blobUrl)),
    db.select({ normalizedKey: songCovers.normalizedKey }).from(songCovers).where(isNotNull(songCovers.blobUrl)),
  ]);

  const photoSet = new Set(photoRows.map((r) => r.normalizedName));
  const coverSet = new Set(coverRows.map((r) => r.normalizedKey));

  const artistKeys = new Set(catalogRows.map((r) => normalize(r.artist)));
  const songKeys = new Set(catalogRows.map((r) => `${normalize(r.title)}::${normalize(r.artist)}`));

  const data: MediaCoverage = {
    artists: { covered: [...artistKeys].filter((k) => photoSet.has(k)).length, total: artistKeys.size },
    songs: { covered: [...songKeys].filter((k) => coverSet.has(k)).length, total: songKeys.size },
  };
  cache = { data, exp: Date.now() + 5 * 60 * 1000 };
  return data;
}
