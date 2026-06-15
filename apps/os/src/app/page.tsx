'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary">
      <div className="text-center">
        <Image
          src="/logo.png"
          alt="eCommerce Hrvatska"
          width={320}
          height={98}
          className="mx-auto brightness-0 invert"
          priority
        />
        <p className="mt-4 text-white/60">Učitavanje...</p>
      </div>
    </div>
  );
}
