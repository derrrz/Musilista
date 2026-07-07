import { createSign } from 'node:crypto';

// Cliente mínimo das APIs de dados do Google (GA4 Data API + Search Console),
// autenticado por service account — sem SDK, só JWT RS256 nativo.
//
// Envs necessárias (sem elas, tudo retorna null e o admin mostra "conectar"):
//   GOOGLE_SA_JSON     — o JSON completo da service account (uma linha)
//   GA4_PROPERTY_ID    — id numérico da propriedade GA4
//   GSC_SITE           — propriedade do Search Console (ex: sc-domain:musilista.com.br)

type ServiceAccount = { client_email: string; private_key: string };

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SA_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') return parsed;
  } catch {}
  return null;
}

const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
].join(' ');

// cache do access token (válido ~1h) e dos relatórios (1h) por instância
let tokenCache: { token: string; exp: number } | null = null;
const reportCache = new Map<string, { data: unknown; exp: number }>();

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

async function accessToken(): Promise<string | null> {
  const sa = serviceAccount();
  if (!sa) return null;
  if (tokenCache && tokenCache.exp > Date.now()) return tokenCache.token;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(sa.private_key).toString('base64url');
  const assertion = `${header}.${claims}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  tokenCache = { token: data.access_token, exp: Date.now() + 50 * 60 * 1000 };
  return data.access_token;
}

async function cachedPost(cacheKey: string, url: string, body: unknown): Promise<unknown | null> {
  const hit = reportCache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return hit.data;
  const token = await accessToken();
  if (!token) return null;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  reportCache.set(cacheKey, { data, exp: Date.now() + 60 * 60 * 1000 });
  return data;
}

export function googleConfigured(): boolean {
  return !!serviceAccount() && !!process.env.GA4_PROPERTY_ID;
}

type Ga4Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };

// Visão geral GA4 dos últimos 7 dias: usuários, sessões, views, tempo médio.
export async function ga4Overview() {
  const prop = process.env.GA4_PROPERTY_ID;
  if (!prop) return null;
  const data = (await cachedPost(
    'ga4-overview',
    `https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`,
    {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
      ],
    },
  )) as { rows?: Ga4Row[] } | null;
  const m = data?.rows?.[0]?.metricValues;
  if (!m) return null;
  return {
    users: Number(m[0]?.value ?? 0),
    sessions: Number(m[1]?.value ?? 0),
    pageViews: Number(m[2]?.value ?? 0),
    avgSessionSec: Math.round(Number(m[3]?.value ?? 0)),
  };
}

// Sessões por canal (orgânico, direto, social…) — 7 dias.
export async function ga4Channels() {
  const prop = process.env.GA4_PROPERTY_ID;
  if (!prop) return null;
  const data = (await cachedPost(
    'ga4-channels',
    `https://analyticsdata.googleapis.com/v1beta/properties/${prop}:runReport`,
    {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    },
  )) as { rows?: Ga4Row[] } | null;
  if (!data?.rows) return null;
  return data.rows.map((r) => ({
    channel: r.dimensionValues?.[0]?.value ?? '—',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

// Top buscas do Google (Search Console) — últimos 28 dias.
export async function gscTopQueries() {
  const site = process.env.GSC_SITE;
  if (!site) return null;
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
  const data = (await cachedPost(
    'gsc-queries',
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    { startDate: start, endDate: end, dimensions: ['query'], rowLimit: 10 },
  )) as { rows?: { keys: string[]; clicks: number; impressions: number }[] } | null;
  if (!data?.rows) return null;
  return data.rows.map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
  }));
}
