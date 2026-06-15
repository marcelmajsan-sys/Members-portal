'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side only for now
  };

  return (
    <section className="flex min-h-[80vh]">
      {/* Left Panel - Branding */}
      <div className="hidden w-1/2 bg-gradient-to-br from-primary to-[#152a4a] lg:flex lg:flex-col lg:items-center lg:justify-center lg:p-12">
        <div className="max-w-md text-center text-white">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent">
            <span className="font-heading text-2xl font-bold text-primary">eC</span>
          </div>
          <h2 className="font-heading text-3xl font-bold">eCommerce Hrvatska</h2>
          <p className="mt-4 text-lg text-white/70">
            Pridruži se najvećoj eCommerce zajednici u Hrvatskoj i unaprijedi svoje online poslovanje.
          </p>
          <div className="mt-10 space-y-4 text-left">
            {['Pristup ekskluzivnim edukacijama', 'Umrežavanje s 500+ članova', 'Safe Shop oznaka povjerenja'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-white/80">
                <svg className="h-5 w-5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center bg-bg-light p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
            <div className="mb-8 text-center">
              <h1 className="font-heading text-2xl font-bold text-text-heading">Prijava</h1>
              <p className="mt-2 text-sm text-text-secondary">Prijavi se u svoj račun</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-heading">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tvoj@email.hr"
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-heading">Lozinka</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Unesite lozinku"
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div className="text-right">
                <Link href="#" className="text-sm font-medium text-accent hover:underline">
                  Zaboravljena lozinka?
                </Link>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-accent py-3.5 font-semibold text-primary transition hover:bg-accent/90"
              >
                Prijavi se
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Nemaš račun?{' '}
              <Link href="/signup" className="font-semibold text-accent hover:underline">
                Registriraj se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
