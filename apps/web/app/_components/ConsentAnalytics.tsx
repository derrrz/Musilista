'use client';

import { useEffect, useState } from 'react';

const GA_ID = 'G-8E1257458N';
const CLARITY_ID = ''; // preencher quando o projeto do Clarity for criado

// Analytics de terceiros (GA4/Clarity) atrás de consentimento LGPD:
// nada carrega antes do aceite; a escolha persiste no localStorage.
// O analytics próprio e o da Vercel são anônimos e não passam por aqui.
function loadThirdParty() {
  if (document.getElementById('ga4-script')) return;

  const ga = document.createElement('script');
  ga.id = 'ga4-script';
  ga.async = true;
  ga.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(ga);

  const inline = document.createElement('script');
  inline.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','${GA_ID}');`;
  document.head.appendChild(inline);

  if (CLARITY_ID) {
    const cl = document.createElement('script');
    cl.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`;
    document.head.appendChild(cl);
  }
}

export function ConsentAnalytics() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let choice: string | null = null;
    try {
      choice = localStorage.getItem('analytics-consent');
    } catch {}
    if (choice === 'granted') loadThirdParty();
    else if (choice !== 'denied') setShow(true);
  }, []);

  function decide(granted: boolean) {
    try {
      localStorage.setItem('analytics-consent', granted ? 'granted' : 'denied');
    } catch {}
    setShow(false);
    if (granted) loadThirdParty();
  }

  if (!show) return null;

  return (
    <div className="print-hide fixed inset-x-0 bottom-0 z-50 border-t border-line bg-raised/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
          Usamos cookies de análise para entender como o site é usado e melhorá-lo.{' '}
          <a href="/terms" className="underline underline-offset-2 hover:text-ink">Saiba mais</a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide(false)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            Recusar
          </button>
          <button
            onClick={() => decide(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}
