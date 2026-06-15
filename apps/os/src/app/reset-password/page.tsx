'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="text-white">Učitavanje...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Lozinka mora imati najmanje 6 znakova');
      return;
    }

    if (password !== confirmPassword) {
      setError('Lozinke se ne podudaraju');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error?.message || 'Link je istekao ili nije valjan. Zatražite novi.');
      }
    } catch {
      setError('Ne mogu se spojiti na server');
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center space-y-4">
          <p className="text-gray-500">Nevažeći link za resetiranje lozinke.</p>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Zatražite novi link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="eCommerce Hrvatska"
            width={280}
            height={86}
            className="mx-auto mb-4"
            priority
          />
          <p className="text-gray-500">Nova lozinka</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-200">
              Lozinka je uspješno promijenjena! Sada se možete prijaviti.
            </div>
            <Link
              href="/login"
              className="block w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white text-center transition hover:bg-primary-light"
            >
              Prijavi se
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg bg-danger-light p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                  Nova lozinka
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Najmanje 6 znakova"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
                  Potvrdite lozinku
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Ponovite lozinku"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-60"
              >
                {loading ? 'Spremanje...' : 'Postavi novu lozinku'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
