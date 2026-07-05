import { permanentRedirect, redirect } from 'next/navigation';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Rota legada /songs/<uuid> — as URLs canônicas agora são
// /<artist_slug>/<title_slug>. Mantida só como redirect.
export default async function LegacySongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [song] = await db
    .select({
      artistSlug: importedSongs.artistSlug,
      titleSlug: importedSongs.titleSlug,
      versionSlug: importedSongs.versionSlug,
    })
    .from(importedSongs)
    .where(eq(importedSongs.id, id))
    .limit(1)
    .catch(() => []);

  if (song?.artistSlug && song.titleSlug) {
    const base = `/${song.artistSlug}/${song.titleSlug}`;
    permanentRedirect(song.versionSlug ? `${base}?versao=${song.versionSlug}` : base);
  }
  redirect('/');
}
