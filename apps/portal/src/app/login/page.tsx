'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user && user.role !== 'MEMBER') {
        window.location.href = '/admin';
      } else {
        router.replace('/');
      }
    }
  }, [isAuthenticated, user, router]);

  if (isAuthenticated) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      // Osoblje (OWNER/OPERATOR) ide u admin panel, članovi na portal
      if (result.role && result.role !== 'MEMBER') {
        window.location.href = '/admin';
      } else {
        router.push('/');
      }
    } else {
      setError(result.error || 'Pogreška pri prijavi');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="eCommerce Hrvatska" width={280} height={86} className="mx-auto mb-4" />
          <p className="text-gray-500">Članski portal — prijava</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-danger-light p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="vas@email.hr"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Lozinka
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-60"
          >
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Zaboravili ste lozinku?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
