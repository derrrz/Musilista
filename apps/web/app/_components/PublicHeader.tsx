import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { MobileNavMenu } from './MobileNavMenu';
import { ThemeToggle } from './ThemeToggle';

// Cabeçalho leve para visitante anônimo em páginas públicas
// (busca, cifra, editor). Quem está logado vê o AppShell autenticado.
export function PublicHeader() {
  return (
    <header className="print-hide flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-8">
      <div className="flex min-w-0 items-center gap-1">
        <MobileNavMenu />
        <Link href="/" className="min-w-0 shrink">
          <Logo />
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <a href="/terms" className="hidden text-xs text-muted underline underline-offset-2 hover:text-ink sm:inline">
          Termos
        </a>
        <a href="/planos" className="hidden text-xs text-muted underline underline-offset-2 hover:text-ink sm:inline">
          Planos
        </a>
        <ThemeToggle />
        <Badge variant="outline">Beta</Badge>
        <Link
          href="/login"
          className="inline-flex h-8 items-center justify-center rounded-lg bg-accent px-3 text-xs font-medium text-accent-ink transition-colors hover:opacity-90 active:opacity-80"
        >
          Entrar
        </Link>
      </div>
    </header>
  );
}
