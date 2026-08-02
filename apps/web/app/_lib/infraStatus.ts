// Status de cotas de infra (Neon Postgres + Vercel Blob) pro painel de admin.
//
// Envs necessárias (sem elas, o card correspondente some no admin):
//   NEON_API_KEY_DEV / NEON_PROJECT_ID_DEV   — projeto de dev
//   NEON_API_KEY_PROD / NEON_PROJECT_ID_PROD — projeto de produção (org separada,
//     provisionada pela integração Neon-Vercel Marketplace)
//   BLOB_READ_WRITE_TOKEN — já usado pelo upload de imagens; reaproveitado aqui
//     pra checar se o store está suspenso.

// Limites do plano Free da Neon — não vêm na resposta da API, só storage
// (branch_logical_size_limit_bytes) e branches (owner.branches_limit) vêm.
const NEON_FREE_TRANSFER_LIMIT_BYTES = 5 * 1024 ** 3; // 5 GB/mês
const NEON_FREE_COMPUTE_HOURS_LIMIT = 191.9; // horas de compute/mês

export type NeonStatus = {
  configured: true;
  name: string;
  transferBytes: number;
  transferLimitBytes: number;
  storageBytes: number;
  storageLimitBytes: number;
  computeHours: number;
  computeHoursLimit: number;
  activeHours: number;
  branchesLimit: number;
  plan: string;
  periodStart: string;
  periodEnd: string;
} | { configured: false };

async function fetchNeonProject(apiKey: string, projectId: string): Promise<NeonStatus> {
  const res = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    next: { revalidate: 300 }, // cota muda devagar — 5min de cache evita bater na API toda hora
  });
  if (!res.ok) throw new Error(`Neon API ${res.status}`);
  const { project: p } = await res.json();
  return {
    configured: true,
    name: p.name,
    transferBytes: p.data_transfer_bytes ?? 0,
    transferLimitBytes: NEON_FREE_TRANSFER_LIMIT_BYTES,
    storageBytes: p.synthetic_storage_size ?? 0,
    storageLimitBytes: p.branch_logical_size_limit_bytes ?? 0,
    computeHours: (p.compute_time_seconds ?? 0) / 3600,
    computeHoursLimit: NEON_FREE_COMPUTE_HOURS_LIMIT,
    activeHours: (p.active_time_seconds ?? 0) / 3600,
    branchesLimit: p.owner?.branches_limit ?? 0,
    plan: p.owner?.subscription_type ?? 'unknown',
    periodStart: p.consumption_period_start,
    periodEnd: p.consumption_period_end,
  };
}

export async function neonDevStatus(): Promise<NeonStatus> {
  const apiKey = process.env.NEON_API_KEY_DEV;
  const projectId = process.env.NEON_PROJECT_ID_DEV;
  if (!apiKey || !projectId) return { configured: false };
  return fetchNeonProject(apiKey, projectId);
}

export async function neonProdStatus(): Promise<NeonStatus> {
  const apiKey = process.env.NEON_API_KEY_PROD;
  const projectId = process.env.NEON_PROJECT_ID_PROD;
  if (!apiKey || !projectId) return { configured: false };
  return fetchNeonProject(apiKey, projectId);
}

export type BlobStatus = {
  configured: true;
  suspended: boolean;
  checkedAt: string;
  error?: string;
} | { configured: false };

// put()/del() de teste é a única forma de saber se o store está suspenso —
// a API do Blob não expõe esse estado por leitura. Cacheado em memória do
// processo por 5min pra não gerar tráfego de "advanced operations" à toa
// (foi justamente uma tempestade de re-puts que causou a suspensão original).
let blobCache: { data: BlobStatus; exp: number } | null = null;

export async function blobStatus(): Promise<BlobStatus> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { configured: false };
  if (blobCache && blobCache.exp > Date.now()) return blobCache.data;

  const { put, del } = await import('@vercel/blob');
  let data: BlobStatus;
  try {
    const blob = await put('_healthcheck/infra-panel.txt', 'ping', {
      access: 'public',
      token,
      addRandomSuffix: true,
    });
    await del(blob.url, { token });
    data = { configured: true, suspended: false, checkedAt: new Date().toISOString() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    data = {
      configured: true,
      suspended: msg.toLowerCase().includes('suspended'),
      checkedAt: new Date().toISOString(),
      error: msg,
    };
  }
  blobCache = { data, exp: Date.now() + 5 * 60 * 1000 };
  return data;
}
