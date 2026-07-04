import { redirect } from 'next/navigation';
import { getAuthUser } from '@/app/_lib/authUser';
import { AppShell } from '@/app/_components/AppShell';

// Shell autenticado: toda rota dentro de (app) exige sessão — o dono
// do gate é este layout, não as páginas.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect('/login');

  return <AppShell user={user}>{children}</AppShell>;
}
