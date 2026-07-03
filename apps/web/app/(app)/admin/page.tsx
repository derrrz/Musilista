import type { Metadata } from 'next';
import { getAuthUser } from '@/app/_lib/authUser';
import { AdminView } from './AdminView';

export const metadata: Metadata = { title: 'Admin · Musilista' };

export default async function AdminPage() {
  const user = await getAuthUser();
  return (
    <div className="p-8">
      <div className="mb-7 flex flex-col gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
          Administração
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Admin</h1>
      </div>
      <AdminView myRole={user?.role ?? 'user'} />
    </div>
  );
}
