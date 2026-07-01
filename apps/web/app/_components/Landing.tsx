import { signIn } from '@/auth';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';

const FEATURES = [
  {
    index: '01',
    title: 'Sincronização em tempo real',
    description: 'Conecte o Spotify e veja a cifra acompanhar a música compasso a compasso, no BPM exato da faixa.',
  },
  {
    index: '02',
    title: 'Bandas, corais e grupos',
    description: 'Organize shows e ensaios, compartilhe repertórios e mantenha todos os membros na mesma página.',
  },
  {
    index: '03',
    title: 'Editor A4 profissional',
    description: 'Canvas visual com régua, zoom e paginação automática. Acordes alinhados letra por letra, prontos para imprimir.',
  },
];

export function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      <nav className="flex items-center justify-between border-b border-line px-6 py-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          <a
            href="/terms"
            className="text-xs text-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            Termos de uso
          </a>
          <Badge variant="outline">Beta</Badge>
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center gap-14 px-6 py-14">
        <div className="flex w-full max-w-2xl flex-col items-center gap-7 text-center">
          <Badge variant="neutral">Lançamento Beta · Acesso antecipado</Badge>

          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Cifras em Tempo Real
            <br />
            com a música da sua escolha.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted">
            Crie cifras sincronizadas com o Spotify, organize shows e ensaios com outros músicos —
            bandas, corais, grupos de qualquer tamanho. Tudo em um só lugar, em tempo real.
          </p>

          <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
            <form
              action={async () => {
                'use server';
                await signIn('spotify', { redirectTo: '/' });
              }}
            >
              {/* Verde oficial do Spotify (exigência de marca), demais medidas iguais ao Button lg */}
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#1DB954] px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90 sm:w-auto"
              >
                Conectar com Spotify
              </button>
            </form>
            <form
              action={async () => {
                'use server';
                await signIn('google', { redirectTo: '/' });
              }}
            >
              <Button variant="outline" size="lg" type="submit" className="w-full sm:w-auto">
                Entrar com Google
              </Button>
            </form>
          </div>

          <p className="text-xs text-faint">
            Ao entrar, você concorda com os{' '}
            <a href="/terms" className="text-muted underline underline-offset-2">
              Termos de Uso e Privacidade
            </a>{' '}
            do Musilista.
          </p>
        </div>

        {/* Preview da cifra — "a cifra como código musical" */}
        <Card className="w-full max-w-2xl bg-raised p-0">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Garota de Ipanema
            </span>
            <div className="ml-auto flex items-center gap-4 font-mono text-[11px] text-muted">
              <span>
                <span className="text-faint">TOM </span>
                <span className="font-semibold text-ink">F</span>
              </span>
              <span>
                <span className="text-faint">CAPO </span>
                <span className="font-semibold text-ink">1</span>
              </span>
              <span className="text-accent">● 132 BPM</span>
            </div>
          </div>
          <div className="overflow-x-auto px-5 py-4 text-left font-mono text-[13px] leading-relaxed">
            <div className="whitespace-pre font-bold text-accent">{'F7M               G7'}</div>
            <div className="whitespace-pre">{'Olha que coisa mais linda,'}</div>
            <div className="whitespace-pre font-bold text-accent">{'                  Gm7        C7'}</div>
            <div className="whitespace-pre">{'mais cheia de graça…'}</div>
          </div>
        </Card>

        <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="flex flex-col gap-3 text-left">
              <span className="font-mono text-[11px] font-semibold text-accent">{f.index} /</span>
              <CardTitle>{f.title}</CardTitle>
              <CardDescription className="leading-relaxed">{f.description}</CardDescription>
            </Card>
          ))}
        </div>
      </main>

      <footer className="flex items-center justify-center gap-4 border-t border-line py-6 font-mono text-[11px] text-faint">
        <span>Musilista · Cifras em Tempo Real</span>
        <span>·</span>
        <a href="/terms" className="underline underline-offset-2 transition-colors hover:text-muted">
          Termos e Privacidade
        </a>
      </footer>
    </div>
  );
}
