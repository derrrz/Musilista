import type { Metadata } from 'next';
import { getAuthUser } from '@/app/_lib/authUser';
import { AdminView } from './AdminView';
import { Eyebrow, PageTitle } from '@/components/ui/Typography';

export const metadata: Metadata = { title: 'Admin · Musilista' };

export default async function AdminPage() {
  const user = await getAuthUser();
  return (
    <div className="p-8">
      <div className="mb-7 flex flex-col gap-1.5">
        <Eyebrow>Administração</Eyebrow>
        <PageTitle>Admin</PageTitle>
      </div>
      <AdminView myRole={user?.role ?? 'user'} />
    </div>
  );
}
