import { Sidebar } from '@/app/_components/Sidebar';
import { TopBar } from '@/app/_components/TopBar';

// Sidebar é desktop-only (hidden md:flex) — no mobile a navegação é o
// hamburger da TopBar (MobileNavMenu), com os mesmos destinos.
export function AppShellNav({
  isAdmin,
  userName,
  userImage,
  children,
}: {
  isAdmin: boolean;
  userName: string;
  userImage?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar isAdmin={isAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName={userName} userImage={userImage} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
