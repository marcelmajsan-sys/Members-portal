'use client';

import { useState } from 'react';
import Link from 'next/link';

const navItems = [
  { label: 'Novosti', href: '/blog' },
  { label: 'Akademija', href: '/akademija' },
  { label: 'Safe Shop', href: '/safe-shop' },
  { label: 'O nama', href: '/o-nama' },
  { label: 'Događanja', href: '/eventi' },
  { label: 'Članovi', href: '/clanovi' },
  { label: 'Partneri', href: '/partneri' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3 lg:py-4">
        {/* Logo + subtitle */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-heading text-xl lg:text-2xl font-bold text-primary tracking-tight">
                eCommerce
              </span>
              <span className="font-heading text-xl lg:text-2xl font-bold text-accent tracking-tight">
                Hrvatska
              </span>
            </div>
            <span className="text-[10px] lg:text-xs font-semibold tracking-[0.15em] text-text-muted uppercase">
              Udruga &middot; od 2015.
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-text-body font-medium px-3 py-2 rounded-lg hover:text-primary hover:bg-bg-light transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/clanstvo"
            className="ml-3 bg-accent text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-accent-dark transition-all whitespace-nowrap"
          >
            Postani član
          </Link>
        </nav>

        {/* Mobile right side: search + hamburger + CTA */}
        <div className="flex items-center gap-2 lg:hidden">
          {/* Search icon */}
          <button className="p-2 text-text-body" aria-label="Pretraži">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          {/* Hamburger */}
          <button
            className="p-2 text-text-dark"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Zatvori izbornik' : 'Otvori izbornik'}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Mobile CTA */}
          <Link
            href="/clanstvo"
            className="bg-accent text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-accent-dark transition-all whitespace-nowrap"
          >
            Postani član
          </Link>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl lg:hidden overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <Link href="/" className="flex flex-col" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex items-center gap-1">
                  <span className="font-heading text-xl font-bold text-primary">eCommerce</span>
                  <span className="font-heading text-xl font-bold text-accent">Hrvatska</span>
                </div>
                <span className="text-[10px] font-semibold tracking-[0.15em] text-text-muted uppercase">
                  Udruga &middot; od 2015.
                </span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-text-dark"
                aria-label="Zatvori izbornik"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-5 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-text-body font-medium py-3 px-4 rounded-lg hover:bg-bg-light hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4">
                <Link
                  href="/clanstvo"
                  className="block text-center bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent-dark transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Postani član
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
