import { NextRequest, NextResponse } from 'next/server'

type SearchResult = { url: string; title: string; artist: string; tabId?: number }

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'Cache-Control': 'no-cache',
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function toSlug(text: string): string {
  return text.trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// Same as toSlug but also applies common letter substitutions (y→i, ph→f)
function toSlugFuzzy(text: string): string {
  return toSlug(text)
    .replace(/ph/g, 'f')
    .replace(/y/g, 'i')
    .replace(/ck/g, 'k')
}

async function fetchArtistSongs(artistSlug: string, songFilter?: string): Promise<SearchResult[]> {
  const pageUrl = `https://www.cifraclub.com.br/${artistSlug}/`
  let html: string
  try {
    const res = await fetch(pageUrl, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return []
    html = await res.text()
  } catch {
    return []
  }

  const results: SearchResult[] = []
  const seen = new Set<string>()

  const escSlug = artistSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(
    `href="(\\/${escSlug}\\/([a-z0-9][a-z0-9-]*)\\/?)"[\\s\\S]{0,800}?primaryLabel[^>]*>([^<]+)<\\/p>`,
    'gi'
  )

  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const href     = m[1].endsWith('/') ? m[1] : m[1] + '/'
    const songSlug = m[2]
    const title    = decodeEntities(m[3].trim())

    if (!songSlug || seen.has(href)) continue

    if (songFilter) {
      const f = toSlug(songFilter)
      if (!songSlug.includes(f) && !toSlug(title).includes(f)) continue
    }

    seen.add(href)
    const artist = artistSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    results.push({ url: `https://www.cifraclub.com.br${href}`, title, artist })
    if (results.length >= 8) break
  }

  return results
}

export async function GET(request: NextRequest) {
  const params    = request.nextUrl.searchParams
  const artist    = params.get('artist')?.trim() ?? ''
  const songTitle = params.get('title')?.trim() ?? ''
  const q         = params.get('q')?.trim() ?? `${artist} ${songTitle}`.trim()
  const bananaOnly = params.get('banana') === '1'

  if (q.length < 2) return NextResponse.json({ results: [] })

  // Atalho: pula CifraClub e vai direto ao Bananacifras (mais rápido para pipeline automático)
  if (bananaOnly) {
    const bcResult = await searchBananaCifras(artist || q, songTitle || q)
    return NextResponse.json({ results: bcResult ? [bcResult] : [] })
  }

  // ── Bananacifras — primeiro (servidor, sem bloqueio WAF do Vercel) ──────────
  const bcResult = await searchBananaCifras(artist || q, songTitle || q)
  if (bcResult) return NextResponse.json({ results: [bcResult] })

  // ── CifraClub — fallback (bloqueado do servidor em alguns casos) ─────────────
  const words = q.split(/\s+/)
  const tried = new Set<string>()

  async function attempt(artistSlug: string, filter?: string): Promise<SearchResult[] | null> {
    if (!artistSlug || tried.has(artistSlug)) return null
    tried.add(artistSlug)
    const r = await fetchArtistSongs(artistSlug, filter)
    return r.length > 0 ? r : null
  }

  if (artist && songTitle) {
    const artistSlugsToTry = [...new Set([toSlug(artist), toSlugFuzzy(artist)].filter(Boolean))]
    const songSlugsToTry   = [...new Set([toSlug(songTitle), toSlugFuzzy(songTitle)].filter(Boolean))]
    for (const aSlug of artistSlugsToTry) {
      for (const sSlug of songSlugsToTry) {
        const url = `https://www.cifraclub.com.br/${aSlug}/${sSlug}/`
        const ok = await fetch(url, { method: 'GET', headers: FETCH_HEADERS, signal: AbortSignal.timeout(6_000) })
          .then(r => r.ok).catch(() => false)
        if (ok) {
          const artistName = aSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          return NextResponse.json({ results: [{ url, title: songTitle, artist: artistName }] })
        }
      }
    }
  }

  for (let i = Math.min(words.length, 3); i >= 1; i--) {
    const slug   = toSlug(words.slice(0, i).join(' '))
    const filter = words.slice(i).join(' ').trim() || undefined
    const r = await attempt(slug, filter)
    if (r) return NextResponse.json({ results: r })
  }

  if (artist) {
    const r = await attempt(toSlug(artist), songTitle || undefined)
    if (r) return NextResponse.json({ results: r })
  }

  const fuzzyArtistSlug = artist ? toSlugFuzzy(artist) : ''
  const fuzzySongFilter = songTitle ? toSlug(songTitle) : undefined
  if (fuzzyArtistSlug && fuzzyArtistSlug !== toSlug(artist)) {
    const r = await attempt(fuzzyArtistSlug, fuzzySongFilter)
    if (r) return NextResponse.json({ results: r })
  }

  for (let i = Math.min(words.length, 3); i >= 1; i--) {
    const slug   = toSlugFuzzy(words.slice(0, i).join(' '))
    const filter = words.slice(i).join(' ').trim() || undefined
    const r = await attempt(slug, filter)
    if (r) return NextResponse.json({ results: r })
  }

  return NextResponse.json({ results: [] })
}

// ── Bananacifras search ───────────────────────────────────────────────────────

async function searchBananaCifras(artist: string, title: string): Promise<SearchResult | null> {
  try {
    // CDN API pública — não precisa de versão e não passa pelo Cloudflare do site principal
    const q = `${artist} ${title}`.trim()
    const searchUrl = `https://cifra.b-cdn.net/searchapi/song?BR=1&q=${encodeURIComponent(q)}`
    const results = await fetch(searchUrl, {
      headers: { 'User-Agent': FETCH_HEADERS['User-Agent'], 'Referer': 'https://www.bananacifras.com/' },
      signal: AbortSignal.timeout(8_000),
    }).then(r => r.json()).catch(() => []) as unknown[][]

    if (!Array.isArray(results) || results.length === 0) return null

    // Formato: [id, songSlug, songTitle, artistSlug, artistName, hasChords]
    const [tabId, songSlug, songTitle, artistSlug, artistName] = results[0] as [number, string, string, string, string, number]
    if (!songSlug || !artistSlug) return null

    const url = `https://www.bananacifras.com/cifra/${artistSlug[0]}/${artistSlug}/${songSlug}`
    return { url, title: songTitle, artist: artistName, tabId }
  } catch {
    return null
  }
}
