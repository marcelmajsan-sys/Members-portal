'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await api.post('/api/auth/forgot-password', { email });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="eCommerce Hrvatska" className="mx-auto mb-4 h-12 w-auto" />
          <p className="text-gray-500">Zaboravljena lozinka</p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-lg bg-success-light p-4 text-sm text-success">
              Ako email postoji u sustavu, poslali smo link za postavljanje nove lozinke.
            </div>
            <Link href="/login" className="text-sm text-primary hover:underline">Natrag na prijavu</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-60"
            >
              {loading ? 'Slanje...' : 'Pošalji link'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">Natrag na prijavu</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
