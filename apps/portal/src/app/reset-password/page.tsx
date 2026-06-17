'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Lozinka mora imati najmanje 6 znakova'); return; }
    if (password !== confirm) { setError('Lozinke se ne podudaraju'); return; }
    setLoading(true);
    const res = await api.post('/api/auth/reset-password', { token, password });
    if (res.success) {
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } else {
      setError(res.error?.message || 'Link je nevažeći ili je istekao');
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-danger-light p-4 text-sm text-danger">Nedostaje token. Otvorite link iz emaila.</div>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">Zatraži novi link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg bg-success-light p-4 text-center text-sm text-success">
        Lozinka postavljena! Preusmjeravamo na prijavu...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <div className="rounded-lg bg-danger-light p-3 text-sm text-danger">{error}</div>}
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Nova lozinka</label>
        <input
          id="password" type="password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Najmanje 6 znakova"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">Potvrdite lozinku</label>
        <input
          id="confirm" type="password" required value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <button
        type="submit" disabled={loading}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-60"
      >
        {loading ? 'Spremanje...' : 'Postavi lozinku'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="eCommerce Hrvatska" className="mx-auto mb-4 h-12 w-auto" />
          <p className="text-gray-500">Postavljanje lozinke</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-gray-400">Učitavanje...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
