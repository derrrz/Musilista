import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/inicio', destination: '/', permanent: false }];
  },
};

export default nextConfig;
