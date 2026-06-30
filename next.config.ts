import type { NextConfig } from 'next';

// All pages/routes not handled locally proxy to the original working deployment
const ORIGIN = 'https://musilista-iqzjlvmzd-lopesedersouza-7157s-projects.vercel.app';

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
