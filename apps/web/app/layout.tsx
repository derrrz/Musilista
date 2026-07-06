import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-ui-next',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-next',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.musilista.com.br'),
  title: {
    default: 'Musilista — Cifras com acordes, tom e transposição',
    template: '%s | Musilista',
  },
  description:
    'Acervo de cifras com acordes, tom, capotraste e transposição. Busque por música ou artista e monte repertórios.',
  openGraph: {
    siteName: 'Musilista',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
