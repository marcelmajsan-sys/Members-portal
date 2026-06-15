'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sidebarLinks = [
  { href: '/o-nama', label: 'O eCommerce.hr' },
  { href: '/o-nama/impressum', label: 'Impressum' },
  { href: '/o-nama/bitni-dogadaji', label: 'Bitni događaji' },
  { href: '/o-nama/clanovi-tima', label: 'Članovi tima' },
  { href: '/o-nama/faq', label: 'FAQ' },
];

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="bg-bg-light min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-text-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="text-accent hover:underline">
                Početna
              </Link>
            </li>
            <li className="text-[#CBD5E1]">/</li>
            <li>
              <Link href="/o-nama" className="text-accent hover:underline">
                O nama
              </Link>
            </li>
            {pathname !== '/o-nama' && (
              <>
                <li className="text-[#CBD5E1]">/</li>
                <li className="font-medium text-text-heading">
                  {sidebarLinks.find((l) => l.href === pathname)?.label ?? ''}
                </li>
              </>
            )}
          </ol>
        </nav>

        <div className="flex flex-col gap-10 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-64">
            <nav
              aria-label="About navigation"
              className="rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm"
            >
              <ul className="space-y-1">
                {sidebarLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'border-l-4 border-accent bg-bg-section text-text-heading font-semibold'
                            : 'text-text-secondary hover:bg-bg-section hover:text-text-heading'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
