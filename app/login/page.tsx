import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/groups');

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0a',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        padding: 40,
        borderRadius: 16,
        border: '1px solid #1f2937',
        background: '#111111',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ color: '#84cc16', fontSize: 28 }}>♪</span>
            <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', color: '#fff' }}>MUSILISTA</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(132,204,22,0.2)', color: '#84cc16' }}>BETA</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>Gerencie grupos, eventos e repertórios musicais</p>
        </div>

        <form
          style={{ width: '100%' }}
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/groups' });
          }}
        >
          <button
            type="submit"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '12px 20px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: '#1f2937',
              color: '#e5e7eb',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>
        </form>

        <p style={{ margin: 0, fontSize: 12, color: '#374151', textAlign: 'center' }}>
          Ao entrar, você concorda com os{' '}
          <a href="/terms" style={{ color: '#6b7280' }}>Termos de Uso</a>
        </p>
      </div>
    </div>
  );
}
