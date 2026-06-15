'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await api.post('/api/auth/forgot-password', { email });

    if (res.success) {
      setSent(true);
    } else {
      setError(res.error?.message || 'Došlo je do greške');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary font-heading">Member Zone</h1>
          <p className="text-text-secondary mt-2">eCommerce Hrvatska</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
          <h2 className="text-xl font-semibold text-text-heading">Zaboravljena lozinka</h2>

          {sent ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">
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
              <p className="text-sm text-text-secondary">
                Unesite email adresu svog računa i poslat ćemo vam link za resetiranje lozinke.
              </p>

              {error && (
                <div className="bg-red-50 text-error text-sm rounded-lg px-4 py-3 border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-body mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="vas@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Slanje...' : 'Pošalji link'}
                </button>
              </form>

              <Link
                href="/login"
                className="block text-center text-sm text-primary hover:underline"
              >
                Natrag na prijavu
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
