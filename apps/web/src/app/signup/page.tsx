'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    membershipType: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Client-side only for now
  };

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
            Postani dio zajednice od 500+ web trgovaca, stručnjaka i nuditelja usluga.
          </p>
          <div className="mt-10 space-y-4 text-left">
            {['eCommerce Akademija - 8 modula', 'Safe Shop oznaka povjerenja', 'CRO Commerce konferencija', 'Ekskluzivni vodiči i istraživanja'].map((item) => (
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
              <h1 className="font-heading text-2xl font-bold text-text-heading">
                Registracija
              </h1>
              <p className="mt-2 text-sm text-text-secondary">Kreiraj novi račun</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-heading">Ime</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-heading">Prezime</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-heading">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="tvoj@email.hr"
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-heading">Lozinka</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-heading">
                  Potvrdite lozinku
                </label>
                <input
                  type="password"
                  required
                  value={form.confirmPassword}
                  onChange={(e) => update('confirmPassword', e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-heading">
                  Tip članstva
                </label>
                <select
                  required
                  value={form.membershipType}
                  onChange={(e) => update('membershipType', e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] px-4 py-3 text-text-heading outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                >
                  <option value="">Odaberi tip članstva</option>
                  <option value="web-trgovina">Web trgovina</option>
                  <option value="nuditelj-usluga">Nuditelj usluga</option>
                  <option value="fizicki-clan">Fizički član</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-accent py-3.5 font-semibold text-primary transition hover:bg-accent/90"
              >
                Registriraj se
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              Već imaš račun?{' '}
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Prijavi se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
