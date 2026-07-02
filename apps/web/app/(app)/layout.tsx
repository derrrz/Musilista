import { redirect } from 'next/navigation';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { Sidebar } from '@/app/_components/Sidebar';
import { TopBar } from '@/app/_components/TopBar';

// Shell autenticado: toda rota dentro de (app) ganha Sidebar + TopBar
// e exige sessão — o dono do shell é este layout, não as páginas.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar isAdmin={isPrivilegedRole(user.role)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName={user.name ?? user.email} userImage={user.image} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
