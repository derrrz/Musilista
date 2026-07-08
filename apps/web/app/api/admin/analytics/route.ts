import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { googleConfigured, ga4Overview, ga4Channels, gscTopQueries } from '@/app/_lib/googleData';
import { db } from '@/db';
import { pageEvents, pageViewsDaily } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

// Analytics primeira-parte: agregado diário (page_views_daily) pro histórico
// e eventos crus das últimas 48h (page_events) pro "online agora" e únicos.
export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const metric = req.nextUrl.searchParams.get('metric') ?? 'overview';

  try {
    switch (metric) {
      case 'overview': {
        const [row] = await db
          .select({
            pv7d: sql<number>`coalesce((select sum(views) from page_views_daily where day > current_date - 7), 0)::int`,
            pvToday: sql<number>`coalesce((select sum(views) from page_views_daily where day = current_date), 0)::int`,
            uniques24h: sql<number>`(select count(distinct visitor) from page_events where created_at > now() - interval '24 hours')::int`,
            online: sql<number>`(select count(distinct visitor) from page_events where created_at > now() - interval '5 minutes')::int`,
            lightShare: sql<number>`coalesce((select round(100.0 * count(*) filter (where theme = 'light') / nullif(count(*) filter (where theme is not null), 0)) from page_events), 0)::int`,
          })
          .from(sql`(select 1) as t`);
        return NextResponse.json({ configured: true, ...row });
      }

      case 'daily': {
        const rows = await db
          .select({
            day: pageViewsDaily.day,
            pv: sql<number>`sum(${pageViewsDaily.views})::int`,
          })
          .from(pageViewsDaily)
          .where(sql`${pageViewsDaily.day} > current_date - 14`)
          .groupBy(pageViewsDaily.day)
          .orderBy(pageViewsDaily.day);
        return NextResponse.json(rows);
      }

      case 'top_pages': {
        const rows = await db
          .select({
            path: pageViewsDaily.path,
            count: sql<number>`sum(${pageViewsDaily.views})::int`,
          })
          .from(pageViewsDaily)
          .where(sql`${pageViewsDaily.day} > current_date - 7`)
          .groupBy(pageViewsDaily.path)
          .orderBy(desc(sql`sum(${pageViewsDaily.views})`))
          .limit(10);
        return NextResponse.json(rows);
      }

      // Dados externos do Google (GA4 + Search Console) centralizados no
      // painel — cacheados por 1h no servidor pra respeitar quotas.
      case 'google': {
        if (req.nextUrl.searchParams.get('debug') === '1') {
          return NextResponse.json({
            hasB64: !!process.env.GOOGLE_SA_JSON_B64,
            b64Len: (process.env.GOOGLE_SA_JSON_B64 || '').length,
            hasRaw: !!process.env.GOOGLE_SA_JSON,
            gaProp: process.env.GA4_PROPERTY_ID,
            gscSite: process.env.GSC_SITE,
            configuredResult: googleConfigured(),
          });
        }
        if (!googleConfigured()) return NextResponse.json({ configured: false });
        const [overview, channels, queries] = await Promise.all([
          ga4Overview(),
          ga4Channels(),
          gscTopQueries(),
        ]);
        return NextResponse.json({ configured: true, overview, channels, queries });
      }

      case 'campaigns': {
        const rows = await db
          .select({
            source: pageEvents.utmSource,
            medium: pageEvents.utmMedium,
            campaign: pageEvents.utmCampaign,
            count: sql<number>`count(*)::int`,
          })
          .from(pageEvents)
          .where(sql`${pageEvents.utmSource} is not null`)
          .groupBy(pageEvents.utmSource, pageEvents.utmMedium, pageEvents.utmCampaign)
          .orderBy(desc(sql`count(*)`))
          .limit(10);
        return NextResponse.json(rows);
      }

      case 'referrers': {
        const rows = await db
          .select({
            referrer: pageEvents.referrer,
            count: sql<number>`count(*)::int`,
          })
          .from(pageEvents)
          .where(sql`${pageEvents.referrer} is not null`)
          .groupBy(pageEvents.referrer)
          .orderBy(desc(sql`count(*)`))
          .limit(8);
        return NextResponse.json(rows);
      }

      default:
        return NextResponse.json({ error: 'unknown metric' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
