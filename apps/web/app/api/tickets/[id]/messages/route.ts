import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { tickets, ticketMessages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';

const replySchema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isStaff = TICKET_STAFF_ROLES.includes(user.role);
  if (ticket.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await parseBody(req, replySchema);
  if (!parsed.ok) return parsed.response;

  const [message] = await db.insert(ticketMessages)
    .values({ ticketId: id, userId: user.id, body: parsed.data.body, isAdmin: isStaff })
    .returning();

  // Reabrir ticket ao usuário responder; marcar em atendimento ao staff responder
  if (!isStaff && ticket.status === 'closed') {
    await db.update(tickets).set({ status: 'open' }).where(eq(tickets.id, id));
  }
  if (isStaff && ticket.status === 'open') {
    await db.update(tickets).set({ status: 'in_progress' }).where(eq(tickets.id, id));
  }
  await db.update(tickets).set({ updatedAt: new Date().toISOString() }).where(eq(tickets.id, id));

  return NextResponse.json(message, { status: 201 });
}
