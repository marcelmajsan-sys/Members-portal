import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ecommerce-hr/shared'],
  // Admin panel se poslužuje pod /admin (npr. members.ecommerce.hr/admin).
  basePath: '/admin',
};

export default nextConfig;
