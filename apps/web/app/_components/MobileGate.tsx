'use client';

import { useIsMobileViewport } from '@/app/_lib/useIsMobileViewport';
import { DesktopOnlyNotice } from './DesktopOnlyNotice';

// Envolve páginas que não existem no app mobile (Editor, Admin, Suporte,
// Roadmap, Planos, Termos) — em viewport estreito, bloqueia com uma
// mensagem em vez de renderizar o conteúdo desktop-only.
export function MobileGate({ featureName, children }: { featureName: string; children: React.ReactNode }) {
  const isMobile = useIsMobileViewport();
  if (isMobile) return <DesktopOnlyNotice featureName={featureName} />;
  return <>{children}</>;
}
