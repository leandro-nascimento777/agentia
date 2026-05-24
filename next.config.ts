import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['whatsapp-web.js', 'puppeteer', 'puppeteer-core'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
