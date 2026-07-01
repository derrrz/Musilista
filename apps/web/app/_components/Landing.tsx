import { signIn } from '@/auth';

const FEATURES = [
  {
    title: 'Sincronização em tempo real',
    description: 'Conecte o Spotify e veja a cifra acompanhar a música compasso a compasso, no BPM exato da faixa.',
  },
  {
    title: 'Bandas, corais e grupos',
    description: 'Organize shows e ensaios, compartilhe repertórios e mantenha todos os membros na mesma página.',
  },
  {
    title: 'Editor A4 profissional',
    description: 'Canvas visual com régua, zoom e paginação automática. Acordes alinhados letra por letra, prontos para imprimir.',
  },
];

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🎸</span>
          <span className="text-base font-bold tracking-tight">Musilista</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <a href="/terms" className="underline underline-offset-2 hover:opacity-80 transition-opacity text-muted">
            Termos de uso
          </a>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-line text-accent">
            Beta
          </span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 py-12 gap-14">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-line text-muted">
          Lançamento Beta · Acesso antecipado
        </span>

        <div className="flex flex-col items-center gap-7 text-center max-w-2xl w-full">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
            Cifras em Tempo Real
            <br />
            com a música da sua escolha.
          </h1>
          <p className="text-base leading-relaxed max-w-lg text-muted">
            Crie cifras sincronizadas com o Spotify, organize shows e ensaios com outros músicos —
            bandas, corais, grupos de qualquer tamanho. Tudo em um só lugar, em tempo real.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <form
              action={async () => {
                'use server';
                await signIn('spotify', { redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="px-5 py-3 rounded-xl font-semibold text-sm"
                style={{ background: '#1DB954', color: '#000' }}
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
              <button
                type="submit"
                className="px-5 py-3 rounded-xl font-semibold text-sm border border-line bg-surface text-ink"
              >
                Entrar com Google
              </button>
            </form>
          </div>

          <p className="text-xs text-faint">
            Ao entrar, você concorda com os{' '}
            <a href="/terms" className="underline underline-offset-2 text-muted">
              Termos de Uso e Privacidade
            </a>{' '}
            do Musilista.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-3 p-5 rounded-2xl text-left bg-surface border border-line">
              <span className="text-sm font-semibold">{f.title}</span>
              <span className="text-xs leading-relaxed text-muted">{f.description}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 flex items-center justify-center gap-4 text-xs text-faint border-t border-line">
        <span>Musilista · Cifras em Tempo Real</span>
        <span>·</span>
        <a href="/terms" className="underline underline-offset-2 hover:opacity-70 transition-opacity">
          Termos e Privacidade
        </a>
      </footer>
    </div>
  );
}
