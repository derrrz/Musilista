// Slugs das URLs públicas do acervo: /<artist-slug>/<title-slug>.
// Mantido em sincronia com scripts/upload-acervo.mjs (espelho .mjs).

export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// Primeiros segmentos de URL que nunca podem virar slug de artista.
// Rotas estáticas vencem as dinâmicas no App Router, mas a lista protege
// contra colisão com rotas FUTURAS — o import valida contra ela.
export const RESERVED_SLUGS = new Set([
  'login', 'planos', 'terms', 'agenda', 'editor', 'songs', 'api',
  'admin', 'groups', 'profile', 'roadmap', 'support', 'artistas',
  'inicio', 'sitemap', 'robots', 'icon', 'favicon', 'manifest',
  'sobre', 'contato', 'busca', 'search', 'conta', 'ajuda', 'blog',
  'privacidade', 'assets', 'static', 'app', 'mobile', 'dashboard',
])
