import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { feedbackEnabled, setFeedbackEnabled } from '@/app/_lib/appSettings';

export async function GET() {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json({ feedbackEnabled: await feedbackEnabled() });
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.feedbackEnabled !== 'boolean') {
    return NextResponse.json({ error: 'feedbackEnabled deve ser boolean' }, { status: 400 });
  }
  await setFeedbackEnabled(body.feedbackEnabled);
  return NextResponse.json({ feedbackEnabled: body.feedbackEnabled });
}
