import { NextRequest, NextResponse } from 'next/server'
import { parseCifraClub } from '@/app/_lib/cifraParser/cifraClubHtml'
import { parsePlainTextChords } from '@/app/_lib/cifraParser/bananacifrasText'

const BROWSER_HEADERS = {
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

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
  }

  // ── Bananacifras ─────────────────────────────────────────────────────────────
  // Estratégia 1a: CDN tab.js via tabId obtido da busca CDN (sem Cloudflare)
  // Estratégia 1b: fetch direto do HTML (funciona quando Cloudflare está leniente)
  // Estratégia 2: CifraClub com o mesmo slug artista/música
  if (parsed.hostname.endsWith('bananacifras.com')) {
    const base = 'https://www.bananacifras.com'

    // Extrai slugs do path: /tipo/letra/artistaSlug/musicaSlug
    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const artistSlug = pathParts[2] ?? ''
    const songSlugRaw = pathParts[3] ?? ''

    // CDN de busca: retorna [tabId, songSlug, songTitle, artistSlug, artistName, hasChords]
    // Não passa pelo Cloudflare — funciona do servidor
    let cdnTitle = songSlugRaw.replace(/-/g, ' ')
    let cdnArtist = artistSlug.replace(/-/g, ' ')
    let cdnTabId: number | null = null
    if (artistSlug && songSlugRaw) {
      const q = `${artistSlug.replace(/-/g, ' ')} ${songSlugRaw.replace(/-/g, ' ')}`
      const cdnResults = await fetch(
        `https://cifra.b-cdn.net/searchapi/song?BR=1&q=${encodeURIComponent(q)}`,
        { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': `${base}/` }, signal: AbortSignal.timeout(6_000) },
      ).then(r => r.json()).catch(() => []) as [number, string, string, string, string][]
      const best = cdnResults.find(r => r[1] === songSlugRaw && r[3] === artistSlug) ?? cdnResults[0]
      if (best) {
        cdnTabId  = best[0] ?? null
        cdnTitle  = best[2] || cdnTitle
        cdnArtist = best[4] || cdnArtist
      }
    }

    // Estratégia 1a: tab.js via tabId — endpoint JSON que normalmente não exige verificação
    if (cdnTabId) {
      for (const tabUrl of [
        `${base}/json/tab.js?id=${cdnTabId}`,
        `https://cifra.b-cdn.net/json/tab.js?id=${cdnTabId}`,
      ]) {
        try {
          const tabData = await fetch(tabUrl, {
            headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': `${base}/` },
            signal: AbortSignal.timeout(8_000),
          }).then(r => r.ok ? r.json() : null).catch(() => null) as { content?: string; tone?: string; capo?: string } | null
          if (tabData?.content) {
            const result = parsePlainTextChords(tabData.content, cdnTitle, cdnArtist, tabData.tone, tabData.capo)
            if (result.blocks.length > 0) return NextResponse.json(result)
          }
        } catch { /* continua */ }
      }
    }

    // Estratégia 1b: fetch HTML do Bananacifras (pode ser bloqueado pelo Cloudflare)
    try {
      const songHtml = await fetch(url, {
        headers: { ...BROWSER_HEADERS, 'Referer': `${base}/` },
        signal: AbortSignal.timeout(8_000),
      }).then(r => r.ok ? r.text() : null)

      if (songHtml) {
        const songdataMatch = songHtml.match(/songdata\s*=\s*(\{[^}]+\})/)
        if (songdataMatch) {
          const songdata = JSON.parse(songdataMatch[1]) as { tab_id: number; track_name: string; artist_name: string }
          const versionMatch = songHtml.match(/"json":"\/json\/tab\.js\?id=\d+&v=([^"]+)"/)
          const tabUrl = versionMatch
            ? `${base}/json/tab.js?id=${songdata.tab_id}&v=${versionMatch[1]}`
            : `${base}/json/tab.js?id=${songdata.tab_id}`
          const tabData = await fetch(tabUrl,
            { headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'], 'Referer': url }, signal: AbortSignal.timeout(8_000) },
          ).then(r => r.json()).catch(() => null) as { content?: string; tone?: string; capo?: string } | null
          if (tabData?.content) {
            const result = parsePlainTextChords(tabData.content, songdata.track_name, songdata.artist_name, tabData.tone, tabData.capo)
            if (result.blocks.length > 0) return NextResponse.json(result)
          }
        }
      }
    } catch { /* Cloudflare block — cai no fallback */ }

    // Estratégia 2: CifraClub com o mesmo slug (artista e música geralmente são iguais)
    if (artistSlug && songSlugRaw) {
      const songSlugVariants = [...new Set([
        songSlugRaw,
        songSlugRaw.replace(/-completa$/, '').replace(/-simplificada$/, ''),
        songSlugRaw.split('-').slice(0, 3).join('-'),
      ])]
      for (const slug of songSlugVariants) {
        const ccUrl = `https://www.cifraclub.com.br/${artistSlug}/${slug}/`
        try {
          const res = await fetch(ccUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8_000) })
          if (!res.ok) continue
          const html = await res.text()
          const result = parseCifraClub(html)
          if (result.blocks.length > 0) {
            if (!result.title || result.title === 'Sem título') result.title = cdnTitle
            if (!result.artist) result.artist = cdnArtist
            return NextResponse.json(result)
          }
        } catch { continue }
      }
    }

    return NextResponse.json(
      { error: `Não foi possível importar "${cdnTitle}". Tente buscar pelo CifraClub.` },
      { status: 502 },
    )
  }

  const SUPPORTED = ['cifraclub.com.br']
  if (!SUPPORTED.some(h => parsed.hostname.endsWith(h))) {
    return NextResponse.json(
      { error: `Site não suportado: ${parsed.hostname}` },
      { status: 400 }
    )
  }

  let html: string
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    return NextResponse.json(
      { error: `Não foi possível acessar a URL: ${(err as Error).message}` },
      { status: 502 }
    )
  }

  const result = parseCifraClub(html)

  if (result.blocks.length === 0) {
    return NextResponse.json(
      { error: 'Não foi possível extrair a cifra desta página.' },
      { status: 422 }
    )
  }

  return NextResponse.json(result)
}

// POST: recebe HTML bruto (enviado pelo browser via proxy CORS) e parseia
export async function POST(req: NextRequest) {
  const html = await req.text().catch(() => '')
  if (!html || html.length < 100) {
    return NextResponse.json({ error: 'html body required' }, { status: 400 })
  }
  const result = parseCifraClub(html)
  if (result.blocks.length === 0) {
    return NextResponse.json({ error: 'Não foi possível extrair a cifra desta página.' }, { status: 422 })
  }
  return NextResponse.json(result)
}
