import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { IconCheck } from '@/components/ui/icons';
import { MobileGate } from '@/app/_components/MobileGate';

export const metadata: Metadata = {
  title: 'Planos · Musilista',
  description: 'Planos e preços do Musilista.',
};

const INCLUDED = [
  'Acervo de cifras com busca por título e artista',
  'Editor de cifras técnico com transposição e diagramas de acorde',
  'Grupos para bandas e corais, com funções e confirmação de presença',
  'Repertórios e agenda de shows e ensaios',
  'Link público de agenda para compartilhar com o público',
  'Perfil profissional com funções, instrumentos e competências',
  'Suporte via tickets',
];

export default function PlanosPage() {
  return (
    <MobileGate featureName="A página de planos">
      <div className="min-h-screen bg-bg text-ink">
        <nav className="flex items-center justify-between border-b border-line px-6 py-4 sm:px-8">
          <Link href="/">
            <Logo />
          </Link>
        </nav>

        <main className="mx-auto max-w-2xl px-6 py-12">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
            Planos
          </span>
          <h1 className="mb-2 mt-1.5 text-3xl font-bold tracking-tight">
            Durante o Beta, tudo é gratuito
          </h1>
          <p className="mb-10 text-sm leading-relaxed text-muted">
            O Musilista está em fase Beta com acesso por convite. Enquanto durar o Beta,
            todas as funcionalidades estão liberadas sem custo.
          </p>

          <div className="rounded-xl border border-line bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-ink">Beta</h2>
              <Badge variant="outline">Gratuito</Badge>
            </div>
            <ul className="flex flex-col gap-2.5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                  <IconCheck size={16} className="mt-0.5 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-sm leading-relaxed text-muted">
            Planos pagos serão anunciados com antecedência, e quem participou do Beta será avisado
            antes de qualquer mudança. O que está por vir você acompanha no{' '}
            <Link href="/roadmap" className="text-accent underline underline-offset-2">
              roadmap
            </Link>
            .
          </p>
        </main>

        <footer className="flex items-center justify-center gap-4 border-t border-line py-6 font-mono text-[11px] text-faint">
          <span>Musilista · Cifras e repertórios</span>
          <span>·</span>
          <Link href="/terms" className="underline underline-offset-2 transition-colors hover:text-muted">
            Termos de uso
          </Link>
          <span>·</span>
          <Link href="/" className="underline underline-offset-2 transition-colors hover:text-muted">
            Voltar ao início
          </Link>
        </footer>
      </div>
    </MobileGate>
  );
}
