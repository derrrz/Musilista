import { redirect } from 'next/navigation';
import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';

// Gate server-side: só admin/ceo enxergam qualquer rota dentro de /admin
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user || !isPrivilegedRole(user.role)) redirect('/inicio');
  return <>{children}</>;
}
