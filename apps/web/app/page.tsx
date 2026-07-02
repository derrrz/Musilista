import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Landing } from './_components/Landing';

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/inicio');
  return <Landing />;
}
