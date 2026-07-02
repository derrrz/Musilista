import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/groups');

  const devLoginEnabled = process.env.AUTH_DEV_LOGIN === '1' && process.env.NODE_ENV !== 'production';

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="flex w-full max-w-sm flex-col items-center gap-8 p-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2.5">
            <Logo markSize={32} />
            <Badge variant="outline">Beta</Badge>
          </div>
          <p className="text-sm text-muted">Cifras, repertórios e agenda para a sua banda</p>
        </div>

        <form
          className="w-full"
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
        >
          <Button variant="outline" size="lg" type="submit" className="w-full gap-3">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </Button>
        </form>

        {devLoginEnabled && (
          <form
            className="flex w-full flex-col gap-3 border-t border-dashed border-line pt-6"
            action={async (formData: FormData) => {
              'use server';
              await signIn('dev', { email: formData.get('email'), redirectTo: '/' });
            }}
          >
            <span className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              Dev login · ambiente local
            </span>
            <Input
              name="email"
              type="email"
              required
              placeholder="email@dev.local"
              aria-label="Email de desenvolvimento"
            />
            <Button variant="ghost" size="sm" type="submit">
              Entrar como dev
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-faint">
          Ao entrar, você concorda com os{' '}
          <a href="/terms" className="text-muted underline underline-offset-2">
            Termos de Uso
          </a>
        </p>
      </Card>
    </div>
  );
}
