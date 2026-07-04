import { isPrivilegedRole, type AuthUser } from '@/app/_lib/authUser';
import { AppShellNav } from '@/app/_components/AppShellNav';
import { PublicHeader } from '@/app/_components/PublicHeader';

// Decide entre o shell autenticado (Sidebar + TopBar) e o cabeçalho
// público simples, dependendo de haver ou não usuário logado.
export function AppShell({ user, children }: { user: AuthUser | null; children: React.ReactNode }) {
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <PublicHeader />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <AppShellNav isAdmin={isPrivilegedRole(user.role)} userName={user.name ?? user.email} userImage={user.image}>
      {children}
    </AppShellNav>
  );
}
