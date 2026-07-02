import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { tickets, ticketMessages, users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isStaff = TICKET_STAFF_ROLES.includes(user.role);
  if (ticket.userId !== user.id && !isStaff) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await db
    .select({
      id: ticketMessages.id,
      body: ticketMessages.body,
      isAdmin: ticketMessages.isAdmin,
      createdAt: ticketMessages.createdAt,
      userName: users.name,
      userImage: users.image,
    })
    .from(ticketMessages)
    .innerJoin(users, eq(ticketMessages.userId, users.id))
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.createdAt));

  return NextResponse.json({ ticket, messages });
}

const patchSchema = z.object({ status: z.enum(['open', 'in_progress', 'closed']) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!TICKET_STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseBody(req, patchSchema);
  if (!parsed.ok) return parsed.response;

  const [updated] = await db.update(tickets)
    .set({ status: parsed.data.status, updatedAt: new Date().toISOString() })
    .where(eq(tickets.id, id))
    .returning();

  return NextResponse.json(updated);
}
