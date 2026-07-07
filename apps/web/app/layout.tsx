import type { Metadata } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';
import { Analytics } from '@vercel/analytics/next';
import { TrackPageview } from './_components/TrackPageview';
import { ConsentAnalytics } from './_components/ConsentAnalytics';
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

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0f1214' },
    { media: '(prefers-color-scheme: light)', color: '#f6f7f7' },
  ],
};

// Define o tema antes do primeiro paint (sem flash): preferência salva no
// localStorage vence; sem preferência, segue o sistema.
const themeInit = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
        <TrackPageview />
        <ConsentAnalytics />
      </body>
    </html>
  );
}
