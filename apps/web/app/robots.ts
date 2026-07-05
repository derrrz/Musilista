import type { MetadataRoute } from 'next';

const BASE = 'https://www.musilista.com.br';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin', '/groups', '/profile', '/support', '/editor'],
      },
    ],
    // Next não gera sitemap index — os três arquivos entram direto aqui
    // e são submetidos individualmente no Search Console.
    sitemap: [`${BASE}/sitemap/0.xml`, `${BASE}/sitemap/1.xml`, `${BASE}/sitemap/2.xml`],
  };
}
