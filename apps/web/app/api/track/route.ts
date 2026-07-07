import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/db';
import { pageEvents, pageViewsDaily } from '@/db/schema';
import { sql } from 'drizzle-orm';

// Coleta de pageview primeira-parte (dashboard do admin). Anônimo por
// construção: o "visitor" é um hash de ip+user-agent com sal diário —
// não dá pra reverter nem correlacionar entre dias.
export async function POST(req: NextRequest) {
  let path = '';
  let ref: string | undefined;
  let theme: string | null = null;
  try {
    const body = await req.json();
    path = typeof body.path === 'string' ? body.path : '';
    ref = typeof body.ref === 'string' ? body.ref : undefined;
    theme = body.theme === 'light' || body.theme === 'dark' ? body.theme : null;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!path.startsWith('/') || path.length > 200) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (path.startsWith('/admin') || path.startsWith('/api')) {
    return NextResponse.json({ ok: true });
  }

  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || /bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(ua)) {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash('sha256').update(`${ip}|${ua}|${day}`).digest('hex').slice(0, 16);

  // só referrer externo, e só o host — o caminho de origem não interessa
  let referrer: string | null = null;
  if (ref) {
    try {
      const host = new URL(ref).host;
      if (host && !host.endsWith('musilista.com.br')) referrer = host;
    } catch {}
  }

  await db.insert(pageEvents).values({ path, visitor, referrer, theme });
  await db
    .insert(pageViewsDaily)
    .values({ day, path, views: 1 })
    .onConflictDoUpdate({
      target: [pageViewsDaily.day, pageViewsDaily.path],
      set: { views: sql`${pageViewsDaily.views} + 1` },
    });

  // poda oportunista: eventos crus só valem 48h (online/únicos do dia)
  if (Math.random() < 0.05) {
    await db.delete(pageEvents).where(sql`${pageEvents.createdAt} < now() - interval '48 hours'`);
  }

  return NextResponse.json({ ok: true });
}
