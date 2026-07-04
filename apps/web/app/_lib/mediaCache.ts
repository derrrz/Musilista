import { NextResponse } from 'next/server';

// Compartilhado entre as rotas que coletam uma imagem pública (Deezer) uma
// única vez e servem do nosso banco depois (artist-photo, song-cover).

export function normalize(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Os bytes ficam no Vercel Blob, não no Postgres (guardar base64 no banco
// já encheu o plano free do Neon) — a rota só redireciona pra lá, o
// navegador busca a imagem direto do Blob, sem passar pela nossa função.
export function blobRedirectResponse(url: string) {
  return NextResponse.redirect(url, {
    status: 307,
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}

export function notFoundResponse() {
  return new NextResponse(null, { status: 404, headers: { 'Cache-Control': 'public, max-age=3600' } });
}
