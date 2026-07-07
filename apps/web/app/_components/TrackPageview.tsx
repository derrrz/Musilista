'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Beacon de pageview pro analytics primeira-parte (aba Analytics do admin).
// Dispara a cada troca de rota; admin e api ficam de fora.
export function TrackPageview() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    const ref = document.referrer && !document.referrer.includes(location.host)
      ? document.referrer
      : undefined;
    const theme = document.documentElement.getAttribute('data-theme') ?? undefined;
    // parâmetros de campanha (links utm_source=instagram etc.)
    const qs = new URLSearchParams(location.search);
    const utm = {
      utmSource: qs.get('utm_source') ?? undefined,
      utmMedium: qs.get('utm_medium') ?? undefined,
      utmCampaign: qs.get('utm_campaign') ?? undefined,
    };
    const blob = new Blob([JSON.stringify({ path: pathname, ref, theme, ...utm })], { type: 'application/json' });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', blob);
    else fetch('/api/track', { method: 'POST', body: blob, keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
