import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ecommerce-hr/shared'],
  // Admin panel se poslužuje pod /admin (npr. members.ecommerce.hr/admin).
  basePath: '/admin',
  // Bez optimizera: <img src> se renderira doslovno (basePath se NE dodaje automatski),
  // zato logo putanje eksplicitno uključuju /admin (npr. src="/admin/logo.png").
  images: { unoptimized: true },
};

export default nextConfig;
