import { getAuthUser, isPrivilegedRole } from '@/app/_lib/authUser';
import { Landing } from './_components/Landing';
import { Inicio } from './_components/Inicio';

export default async function RootPage() {
  const user = await getAuthUser();
  if (!user) return <Landing />;

  return <Inicio userName={user.name ?? ''} userImage={user.image} isAdmin={isPrivilegedRole(user.role)} />;
}
