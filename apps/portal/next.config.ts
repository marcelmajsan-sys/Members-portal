import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ecommerce-hr/shared'],
  images: { unoptimized: true },
};

export default nextConfig;
