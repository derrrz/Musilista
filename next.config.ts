import type { NextConfig } from 'next';

// Routes not yet rebuilt locally fall back to the legacy branch deployment
const ORIGIN = 'https://musilista-q2f4pw0ky-lopesedersouza-7157s-projects.vercel.app';

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      fallback: [
        { source: '/:path*', destination: `${ORIGIN}/:path*` },
      ],
    };
  },
};

export default nextConfig;
