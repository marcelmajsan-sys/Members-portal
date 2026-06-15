'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-footer-bg text-white">
      {/* Newsletter row */}
      <div className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-heading text-xl font-bold">Prijavite se na newsletter</h3>
              <p className="text-sm text-white/70 mt-1">
                Budite u toku s najnovijim vijestima iz svijeta e-trgovine.
              </p>
            </div>
            <form
              className="flex w-full md:w-auto gap-2"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Vaša email adresa"
                className="flex-1 md:w-72 px-4 py-3 rounded-lg text-sm text-text-dark bg-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="bg-accent text-primary font-semibold text-sm px-6 py-3 rounded-lg hover:bg-accent-light transition-colors whitespace-nowrap"
              >
                Prijavi se
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer columns */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Logo & description */}
          <div>
            <Link href="/" className="inline-flex items-center gap-1 mb-4">
              <span className="font-heading text-xl font-bold text-white">eCommerce</span>
              <span className="font-heading text-xl font-bold text-accent">Hrvatska</span>
            </Link>
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              Vaša vrata u svijet online prodaje
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/ecommerceHrvatska"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/ecommerce-hrvatska"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@ecommerceHrvatska"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Linkovi */}
          <div>
            <h4 className="font-heading font-semibold text-base mb-5">Linkovi</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/blog" className="text-white/70 hover:text-white transition-colors">
                  Novosti
                </Link>
              </li>
              <li>
                <Link href="/akademija" className="text-white/70 hover:text-white transition-colors">
                  Akademija
                </Link>
              </li>
              <li>
                <Link href="/safe-shop" className="text-white/70 hover:text-white transition-colors">
                  Safe Shop
                </Link>
              </li>
              <li>
                <Link href="/vodici" className="text-white/70 hover:text-white transition-colors">
                  eCommerce Magazin
                </Link>
              </li>
              <li>
                <Link href="/eventi" className="text-white/70 hover:text-white transition-colors">
                  Događanja
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Članstvo */}
          <div>
            <h4 className="font-heading font-semibold text-base mb-5">Članstvo</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/web-trgovine" className="text-white/70 hover:text-white transition-colors">
                  Web trgovine
                </Link>
              </li>
              <li>
                <Link href="/nuditelji-usluga" className="text-white/70 hover:text-white transition-colors">
                  Nuditelji usluga
                </Link>
              </li>
              <li>
                <Link href="/clanovi" className="text-white/70 hover:text-white transition-colors">
                  Fizički članovi
                </Link>
              </li>
              <li>
                <Link href="/partneri" className="text-white/70 hover:text-white transition-colors">
                  Partneri
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Kontakt */}
          <div>
            <h4 className="font-heading font-semibold text-base mb-5">Kontakt</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="mailto:udruga@ecommerce.hr" className="text-white/70 hover:text-white transition-colors">
                  udruga@ecommerce.hr
                </a>
              </li>
              <li>
                <a href="tel:+385992025707" className="text-white/70 hover:text-white transition-colors">
                  +385 99 2025707
                </a>
              </li>
              <li className="text-white/70">
                Republike Austrije 9, Zagreb
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/60">
            <span>
              &copy; 2015. - 2026. eCommerce Hrvatska | OIB: 17475291081
            </span>
            <div className="flex items-center gap-6">
              <Link href="/uvjeti" className="hover:text-white transition-colors">
                Uvjeti
              </Link>
              <Link href="/privatnost" className="hover:text-white transition-colors">
                Privatnost
              </Link>
              <Link href="/nacini-placanja" className="hover:text-white transition-colors">
                Plaćanja
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
