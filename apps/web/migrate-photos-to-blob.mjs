import { neon } from '@neondatabase/serverless';
import { put } from '@vercel/blob';

const sql = neon(process.env.DATABASE_URL);
const BATCH = 20;

async function uploadRow(row, folder) {
  const buffer = Buffer.from(row.image_data, 'base64');
  const ext = row.content_type?.includes('png') ? 'png' : 'jpg';
  const pathname = `${folder}/${row.key.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${row.id.slice(0, 8)}.${ext}`;
  const { url } = await put(pathname, buffer, {
    access: 'public',
    contentType: row.content_type ?? 'image/jpeg',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}

async function migrateArtistPhotos() {
  let total = 0;
  while (true) {
    const rows = await sql`
      select id, normalized_name as key, image_data, content_type
      from artist_photos where image_data is not null and blob_url is null limit ${BATCH}
    `;
    if (rows.length === 0) break;
    await Promise.all(rows.map(async (row) => {
      try {
        const url = await uploadRow(row, 'artist-photos');
        await sql`update artist_photos set blob_url = ${url} where id = ${row.id}`;
      } catch (e) {
        console.error(`Falhou artist_photos ${row.id}:`, e.message);
      }
    }));
    total += rows.length;
    console.log(`artist_photos: ${total} migradas...`);
  }
  console.log(`artist_photos: concluído (${total} no total).`);
}

async function migrateSongCovers() {
  let total = 0;
  while (true) {
    const rows = await sql`
      select id, normalized_key as key, image_data, content_type
      from song_covers where image_data is not null and blob_url is null limit ${BATCH}
    `;
    if (rows.length === 0) break;
    await Promise.all(rows.map(async (row) => {
      try {
        const url = await uploadRow(row, 'song-covers');
        await sql`update song_covers set blob_url = ${url} where id = ${row.id}`;
      } catch (e) {
        console.error(`Falhou song_covers ${row.id}:`, e.message);
      }
    }));
    total += rows.length;
    console.log(`song_covers: ${total} migradas...`);
  }
  console.log(`song_covers: concluído (${total} no total).`);
}

await migrateArtistPhotos();
await migrateSongCovers();
console.log('Migração concluída.');
