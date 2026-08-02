import { NextResponse } from 'next/server';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { neonDevStatus, neonProdStatus, blobStatus } from '@/app/_lib/infraStatus';

export async function GET() {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [dev, prod, blob] = await Promise.all([
    neonDevStatus().catch(() => ({ configured: false as const })),
    neonProdStatus().catch(() => ({ configured: false as const })),
    blobStatus().catch(() => ({ configured: false as const })),
  ]);

  return NextResponse.json({ neonDev: dev, neonProd: prod, blob });
}
