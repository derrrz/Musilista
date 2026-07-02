import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { tickets, ticketMessages, users } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';
import { TicketThread } from './TicketThread';

export const metadata = { title: 'Ticket · Musilista' };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
  if (!ticket) notFound();

  const isStaff = TICKET_STAFF_ROLES.includes(user.role);
  if (ticket.userId !== user.id && !isStaff) redirect('/support');

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

  return (
    <TicketThread
      ticket={{ id: ticket.id, title: ticket.title, status: ticket.status }}
      messages={messages.map((m) => ({ ...m, createdAt: m.createdAt ?? null }))}
      isStaff={isStaff}
    />
  );
}
