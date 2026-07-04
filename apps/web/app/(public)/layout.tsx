import { getAuthUser } from '@/app/_lib/authUser';
import { AppShell } from '@/app/_components/AppShell';

// Rotas públicas (busca, cifra, editor): sem gate de sessão. Quem está
// logado ganha o mesmo shell autenticado (Sidebar+TopBar) de sempre;
// visitante anônimo vê o cabeçalho público simples.
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  return <AppShell user={user}>{children}</AppShell>;
}
