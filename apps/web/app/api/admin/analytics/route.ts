import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';

const PH_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
const PH_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PH_PROJECT = process.env.POSTHOG_PROJECT_ID;

async function hogql(query: string): Promise<unknown[][]> {
  const res = await fetch(`${PH_HOST}/api/projects/${PH_PROJECT}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PH_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`PostHog ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.results ?? []) as unknown[][];
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!PH_KEY || !PH_PROJECT) {
    return NextResponse.json({ configured: false });
  }

  const metric = req.nextUrl.searchParams.get('metric') ?? 'overview';

  try {
    switch (metric) {
      case 'overview': {
        const [pv, ev, us] = await Promise.all([
          hogql(`SELECT count() FROM events WHERE event = '$pageview' AND timestamp > now() - interval 7 day`),
          hogql(`SELECT count() FROM events WHERE timestamp > now() - interval 7 day`),
          hogql(`SELECT count(DISTINCT person_id) FROM events WHERE timestamp > now() - interval 7 day`),
        ]);
        return NextResponse.json({
          configured: true,
          pageviews: pv[0]?.[0] ?? 0,
          events: ev[0]?.[0] ?? 0,
          users: us[0]?.[0] ?? 0,
        });
      }

      case 'daily': {
        const rows = await hogql(`
          SELECT toDate(timestamp) as day, count() as pv, count(DISTINCT person_id) as users
          FROM events
          WHERE event = '$pageview' AND timestamp > now() - interval 14 day
          GROUP BY day ORDER BY day ASC
        `);
        return NextResponse.json(rows.map(([day, pv, users]) => ({ day, pv, users })));
      }

      case 'top_pages': {
        const rows = await hogql(`
          SELECT properties.$pathname as path, count() as c
          FROM events
          WHERE event = '$pageview'
            AND timestamp > now() - interval 7 day
            AND isNotNull(properties.$pathname)
          GROUP BY path ORDER BY c DESC LIMIT 10
        `);
        return NextResponse.json(rows.map(([path, count]) => ({ path, count })));
      }

      case 'devices': {
        const rows = await hogql(`
          SELECT properties.$browser as browser, count(DISTINCT person_id) as c
          FROM events
          WHERE timestamp > now() - interval 7 day AND isNotNull(properties.$browser)
          GROUP BY browser ORDER BY c DESC LIMIT 8
        `);
        return NextResponse.json(rows.map(([browser, count]) => ({ browser, count })));
      }

      default:
        return NextResponse.json({ error: 'unknown metric' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
