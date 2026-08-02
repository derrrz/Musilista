import { NextResponse } from 'next/server';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { neonDevStatus, neonProdStatus, blobStatus } from '@/app/_lib/infraStatus';
import { mediaCoverage } from '@/app/_lib/mediaCoverage';
import { getCurrentMonthUsage } from '@/app/_lib/aiUsage';

export async function GET() {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [dev, prod, blob, coverage, aiGateway] = await Promise.all([
    neonDevStatus().catch(() => ({ configured: false as const })),
    neonProdStatus().catch(() => ({ configured: false as const })),
    blobStatus().catch(() => ({ configured: false as const })),
    mediaCoverage().catch(() => null),
    getCurrentMonthUsage().catch(() => null),
  ]);

  return NextResponse.json({ neonDev: dev, neonProd: prod, blob, coverage, aiGateway });
}
