import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { tickets, ticketMessages, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { parseBody } from '@/app/_lib/validate';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (TICKET_STAFF_ROLES.includes(user.role)) {
    const rows = await db
      .select({
        id: tickets.id, title: tickets.title, status: tickets.status,
        createdAt: tickets.createdAt, updatedAt: tickets.updatedAt,
        userName: users.name, userEmail: users.email, userImage: users.image,
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .orderBy(desc(tickets.updatedAt));
    return NextResponse.json({ all: rows, role: user.role });
  }

  const rows = await db.select().from(tickets)
    .where(eq(tickets.userId, user.id))
    .orderBy(desc(tickets.updatedAt));

  return NextResponse.json(rows);
}

const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseBody(req, createTicketSchema);
  if (!parsed.ok) return parsed.response;
  const { title, body } = parsed.data;

  const [ticket] = await db.insert(tickets)
    .values({ userId: user.id, title })
    .returning();

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    userId: user.id,
    body,
    isAdmin: false,
  });

  return NextResponse.json(ticket, { status: 201 });
}
