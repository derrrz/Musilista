import { NextResponse } from 'next/server';
import { getAuthUser } from '@/app/_lib/authUser';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ id: user.id, role: user.role, name: user.name, email: user.email, image: user.image });
}
