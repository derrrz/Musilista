import { NextRequest, NextResponse } from 'next/server'
import { parseCifraText } from '@/app/_lib/cifraParser/plainText'
import { looksLikeChordPro, parseChordPro } from '@/app/_lib/cifraParser/chordpro'

export async function POST(req: NextRequest) {
  const text = await req.text()
  if (!text?.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })
  if (text.length > 200_000) return NextResponse.json({ error: 'Cifra muito grande (máx 200 KB)' }, { status: 413 })

  try {
    const result = looksLikeChordPro(text) ? parseChordPro(text) : parseCifraText(text)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
