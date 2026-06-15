'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setSent(true);
      } else {
        setError(data.error?.message || 'Došlo je do greške');
      }
    } catch {
      setError('Ne mogu se spojiti na server');
    }
    setLoading(false);
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
          <p className="text-gray-500">Zaboravljena lozinka</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-200">
              Ako račun s tom email adresom postoji, poslali smo vam link za resetiranje lozinke. Provjerite inbox (i spam folder).
            </div>
            <Link
              href="/login"
              className="block text-center text-sm text-primary hover:underline"
            >
              Natrag na prijavu
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Unesite email adresu svog računa i poslat ćemo vam link za resetiranje lozinke.
            </p>

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
                  placeholder="marcel@ecommerce.hr"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-60"
              >
                {loading ? 'Slanje...' : 'Pošalji link'}
              </button>
            </form>

            <Link
              href="/login"
              className="mt-4 block text-center text-sm text-primary hover:underline"
            >
              Natrag na prijavu
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
