import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ecommerce-hr/shared'],
  // Admin panel se poslužuje pod /admin (npr. members.ecommerce.hr/admin).
  basePath: '/admin',
  // Bez optimizera — Next ispravno prefiksira basePath na <img src>, pa logo radi pod /admin.
  images: { unoptimized: true },
};

export default nextConfig;
