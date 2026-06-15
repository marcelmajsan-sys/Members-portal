'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-light">
        <div className="text-text-secondary">Učitavanje...</div>
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
    const res = await api.post('/api/auth/reset-password', { token, password });

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error?.message || 'Link je istekao ili nije valjan. Zatražite novi.');
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-light px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-sm p-8 text-center space-y-4">
          <p className="text-text-secondary">Nevažeći link za resetiranje lozinke.</p>
          <Link href="/forgot-password" className="text-sm text-primary hover:underline">
            Zatražite novi link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-light px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary font-heading">Member Zone</h1>
          <p className="text-text-secondary mt-2">eCommerce Hrvatska</p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
          <h2 className="text-xl font-semibold text-text-heading">Nova lozinka</h2>

          {success ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 text-emerald-700 text-sm rounded-lg px-4 py-3 border border-emerald-200">
                Lozinka je uspješno promijenjena! Sada se možete prijaviti.
              </div>
              <Link
                href="/login"
                className="block w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium text-center hover:bg-primary-light transition-colors"
              >
                Prijavi se
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-error text-sm rounded-lg px-4 py-3 border border-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-text-body mb-1">
                    Nova lozinka
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Najmanje 6 znakova"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-body mb-1">
                    Potvrdite lozinku
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Ponovite lozinku"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Spremanje...' : 'Postavi novu lozinku'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
