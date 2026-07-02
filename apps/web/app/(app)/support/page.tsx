import { redirect } from 'next/navigation';
import { db } from '@/db';
import { tickets, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getAuthUser } from '@/app/_lib/authUser';
import { TICKET_STAFF_ROLES } from '@/app/_lib/roles';
import { SupportView } from './SupportView';

export const metadata = { title: 'Suporte · Musilista' };

export default async function SupportPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  const isStaff = TICKET_STAFF_ROLES.includes(user.role);

  const rows = isStaff
    ? await db
        .select({
          id: tickets.id, title: tickets.title, status: tickets.status,
          updatedAt: tickets.updatedAt, userName: users.name,
        })
        .from(tickets)
        .innerJoin(users, eq(tickets.userId, users.id))
        .orderBy(desc(tickets.updatedAt))
    : await db
        .select({
          id: tickets.id, title: tickets.title, status: tickets.status,
          updatedAt: tickets.updatedAt,
        })
        .from(tickets)
        .where(eq(tickets.userId, user.id))
        .orderBy(desc(tickets.updatedAt));

  const list = rows.map((t) => ({
    ...t,
    userName: 'userName' in t ? (t.userName as string | null) : null,
    updatedAt: t.updatedAt ?? null,
  }));

  return <SupportView tickets={list} isStaff={isStaff} />;
}
