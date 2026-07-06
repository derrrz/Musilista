import type { NextConfig } from 'next';

const securityHeaders = [
  // força HTTPS por 2 anos (inclui subdomínios)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // bloqueia sniffing de content-type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // impede o site de ser embutido em iframes de terceiros (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // não vaza a URL completa de origem para outros sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // desliga APIs de navegador que o app não usa
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/inicio', destination: '/', permanent: false }];
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // admin nunca deve aparecer em buscadores, nem por engano
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default nextConfig;
