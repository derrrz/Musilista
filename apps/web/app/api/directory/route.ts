import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { importedSongs } from '@/db/schema';
import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

const SELECT_COLUMNS = { id: importedSongs.id, title: importedSongs.title, artist: importedSongs.artist };

// Ignora acento na comparação — sem isso "legiao" não encontra "Legião" e
// vice-versa (existem artistas cadastrados com e sem acento na base importada).
function unaccentIlike(column: AnyPgColumn, pattern: string): SQL {
  return sql`unaccent(${column}) ilike unaccent(${pattern})`;
}

// Bate como prefixo de PALAVRA (início da string ou logo depois de um
// espaço) em vez de substring solta em qualquer posição. Sem isso um token
// curto como "l" bate em qualquer nome que tenha a letra "l" no meio (ex:
// "Buscaglione"), e "sera" bate no meio de palavras como "diSSERAm" ou
// "buonaSERAsignorina" — resultado cheio de ruído sem relação com a busca.
function wordPrefixMatch(column: AnyPgColumn, token: string): SQL {
  return sql`(unaccent(${column}) ilike unaccent(${`${token}%`}) or unaccent(${column}) ilike unaccent(${`% ${token}%`}))`;
}

// Busca "inteligente" com mais de uma palavra: assume que a primeira palavra
// é (parte d)o título e as palavras seguintes são (parte d)o nome do artista
// — é assim que o usuário digita quando quer desambiguar uma música que tem
// versões de vários artistas, ex: "será legiao urbana". Cada palavra bate
// como início de palavra no campo correspondente (título ou artista), não
// como substring solta — evita casar "l" com qualquer artista que tenha um
// "l" perdido no meio do nome.
function multiWordMatch(tokens: string[]): SQL {
  const [titleToken, ...restTokens] = tokens;
  return and(
    wordPrefixMatch(importedSongs.title, titleToken),
    ...restTokens.map((t) => wordPrefixMatch(importedSongs.artist, t)),
  )!;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const letter = req.nextUrl.searchParams.get('letter')?.trim().toUpperCase() ?? '';
  const artist = req.nextUrl.searchParams.get('artist')?.trim() ?? '';
  // Índice por letra/artista é uma listagem exaustiva (o usuário escolheu entrar nela
  // de propósito) — não pode truncar no meio do alfabeto nem esconder artista/música.
  const browseLimit = 1000;

  // Busca por texto: não dá pra saber se o usuário está digitando título ou
  // artista, então traz os dois separadamente — músicas cujo TÍTULO bate (não
  // basta o artista bater, senão qualquer música do artista aparece "por
  // engano" na lista de músicas) mais os artistas cujo nome corresponde.
  if (q) {
    const pattern = `%${q}%`;
    const tokens = q.split(/\s+/).filter(Boolean);
    // Uma palavra só: bate só no título (não basta o artista bater, senão
    // qualquer música do artista aparece "por engano" — caso já resolvido
    // antes). Duas ou mais palavras: usuário provavelmente está combinando
    // título + artista pra achar uma versão específica ("será legiao urbana").
    // Numa busca de duas ou mais palavras, a relevância do título é medida
    // só pela primeira palavra (a parte que representa o título) — comparar
    // com a query inteira ("sera l") nunca bate exato/prefixo porque o resto
    // é o nome do artista, então tudo cairia no mesmo nível "contém" e a
    // ordenação viraria alfabética pura de novo.
    const titleToken = tokens.length > 1 ? tokens[0] : q;
    const songsCondition = tokens.length > 1
      ? multiWordMatch(tokens)
      : unaccentIlike(importedSongs.title, pattern);
    // Relevância antes de alfabética: título igual ao que foi digitado vem
    // primeiro, depois título que começa com o texto, só então o resto (título
    // que só contém o texto no meio) — senão um match "melhor" (ex: "Será")
    // fica de fora do topo atrás de títulos mais longos que só contêm o termo
    // (ex: "Assim Será", "Bendito Serás") e que vencem por ordem alfabética.
    const songs = await db
      .select(SELECT_COLUMNS)
      .from(importedSongs)
      .where(songsCondition)
      .orderBy(
        sql`case
          when unaccent(${importedSongs.title}) ilike unaccent(${titleToken}) then 0
          when unaccent(${importedSongs.title}) ilike unaccent(${`${titleToken}%`}) then 1
          else 2
        end`,
        importedSongs.title,
      )
      .limit(9);
    const artists = await db
      .select({ name: importedSongs.artist, count: sql<number>`count(*)::int` })
      .from(importedSongs)
      .where(unaccentIlike(importedSongs.artist, pattern))
      .groupBy(importedSongs.artist)
      .orderBy(importedSongs.artist)
      .limit(6);
    return NextResponse.json({ songs, artists });
  }

  // Um artista específico (selecionado a partir do índice por letra): músicas dele.
  if (artist) {
    const rows = await db
      .select(SELECT_COLUMNS)
      .from(importedSongs)
      .where(eq(importedSongs.artist, artist))
      .orderBy(importedSongs.title)
      .limit(browseLimit);
    return NextResponse.json({ songs: rows });
  }

  // Índice alfabético: uma linha por artista (não por música), com a contagem de músicas.
  if (letter) {
    const condition = letter === '0-9'
      ? sql`${importedSongs.artist} ~ '^[0-9]'`
      : unaccentIlike(importedSongs.artist, `${letter}%`);
    const rows = await db
      .select({ name: importedSongs.artist, count: sql<number>`count(*)::int` })
      .from(importedSongs)
      .where(condition)
      .groupBy(importedSongs.artist)
      .orderBy(importedSongs.artist)
      .limit(browseLimit);
    return NextResponse.json({ artists: rows });
  }

  return NextResponse.json({ songs: [] });
}
