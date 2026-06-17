'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import GuidedTour from '@/components/guided-tour';
import { OWNER_TOUR_STEPS } from '@/components/tour-steps';

interface NavItem {
  href: string;
  label: string;
  operatorLabel?: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
  operatorOnly?: boolean;
  tourId?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    tourId: 'nav-dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
  {
    href: '/members',
    label: 'Članovi',
    ownerOnly: true,
    tourId: 'nav-members',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    href: '/ponude',
    label: 'Ponude',
    ownerOnly: true,
    tourId: 'nav-offers',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    href: '/benefits',
    label: 'Benefiti',
    ownerOnly: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Zadaci',
    operatorLabel: 'Moji zadaci',
    tourId: 'nav-tasks',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    href: '/team',
    label: 'Tim',
    ownerOnly: true,
    tourId: 'nav-team',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Kalendar',
    tourId: 'nav-calendar',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
      </svg>
    ),
  },
  {
    href: '/email-templates',
    label: 'Email predlošci',
    ownerOnly: true,
    tourId: 'nav-email-templates',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    href: '/automation',
    label: 'Automatizacija',
    ownerOnly: true,
    tourId: 'nav-automation',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
  },
  {
    href: '/notifications',
    label: 'Obavijesti',
    tourId: 'nav-notifications',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    status: string;
    memberTier: string;
    user: { firstName: string; lastName: string; email: string };
    company: { name: string } | null;
  }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const res = await api.get<typeof searchResults>(`/api/os/members/search?q=${encodeURIComponent(q)}`);
    if (res.success && res.data) setSearchResults(res.data);
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery, doSearch]);

  // Close search on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = searchRef.current?.querySelector('input');
        if (input) { input.focus(); setSearchOpen(true); }
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword.length < 6) { setPwError('Nova lozinka mora imati najmanje 6 znakova'); return; }
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('Lozinke se ne podudaraju'); return; }
    setPwLoading(true);
    const res = await api.post('/api/auth/change-password', {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
    if (res.success) {
      setPwSuccess(true);
      setTimeout(() => { setShowPasswordModal(false); setPwSuccess(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }, 2000);
    } else {
      setPwError(res.error?.message || 'Greška pri promjeni lozinke');
    }
    setPwLoading(false);
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-start tour on first login for OWNER
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'OWNER') {
      const seen = localStorage.getItem('ech-tour-v2');
      if (!seen) {
        // Small delay so the layout is fully rendered
        const t = setTimeout(() => setTourOpen(true), 800);
        return () => clearTimeout(t);
      }
    }
  }, [isLoading, isAuthenticated, user]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <Image
            src="/admin/logo-icon.png"
            alt="eCommerce HR"
            width={32}
            height={32}
            className="brightness-0 invert"
          />
          <span className="text-lg font-bold">{user?.role === 'OPERATOR' ? 'Moja Zona' : 'eCommerce HR'}</span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS
            .filter((item) => {
              if (item.ownerOnly && user?.role !== 'OWNER') return false;
              if (item.operatorOnly && user?.role !== 'OPERATOR') return false;
              return true;
            })
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const label = user?.role === 'OPERATOR' && item.operatorLabel ? item.operatorLabel : item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  data-tour={item.tourId}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {label}
                </Link>
              );
            })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-2 flex items-center justify-between sm:hidden">
            <p className="text-xs text-white/70">{user?.firstName} {user?.lastName}</p>
            <button
              onClick={() => { setShowPasswordModal(true); setSidebarOpen(false); }}
              className="text-xs text-white/50 hover:text-white/80"
            >
              Lozinka
            </button>
          </div>
          <p className="text-xs text-white/50">eCommerce HR OS</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Search */}
          <div ref={searchRef} data-tour="header-search" className="relative mx-2 flex-1 sm:mx-4 lg:max-w-md">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Pretraži... (⌘K)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => { if (searchQuery.trim().length >= 2) setSearchOpen(true); }}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {searchLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Tražim...</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Nema rezultata</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.map((m) => (
                      <Link
                        key={m.id}
                        href={`/members/${m.id}`}
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                        className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {m.user.firstName?.[0]}{m.user.lastName?.[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {m.user.firstName} {m.user.lastName}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            {m.company?.name || m.user.email}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          m.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                          m.status === 'EXPIRED' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {m.memberTier}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4" data-tour="header-user">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="hidden rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 sm:inline-flex"
              title="Promijeni lozinku"
            >
              Lozinka
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Odjava
            </button>
          </div>
        </header>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Promijeni lozinku</h3>
              {pwSuccess ? (
                <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 border border-emerald-200">
                  Lozinka uspješno promijenjena!
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {pwError && (
                    <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                      {pwError}
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Trenutna lozinka</label>
                    <input
                      type="password"
                      required
                      value={pwForm.currentPassword}
                      onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nova lozinka</label>
                    <input
                      type="password"
                      required
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Najmanje 6 znakova"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Potvrdite novu lozinku</label>
                    <input
                      type="password"
                      required
                      value={pwForm.confirmPassword}
                      onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setShowPasswordModal(false); setPwError(''); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                      className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Odustani
                    </button>
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60"
                    >
                      {pwLoading ? 'Spremanje...' : 'Promijeni'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Guided Tour */}
      {user?.role === 'OWNER' && (
        <GuidedTour
          steps={OWNER_TOUR_STEPS}
          isOpen={tourOpen}
          onClose={() => {
            setTourOpen(false);
            localStorage.setItem('ech-tour-v2', '1');
          }}
          onComplete={() => {
            setTourOpen(false);
            localStorage.setItem('ech-tour-v2', '1');
          }}
        />
      )}

      {/* Help button */}
      {user?.role === 'OWNER' && !tourOpen && (
        <button
          onClick={() => setTourOpen(true)}
          className="group fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1B365D] to-[#234175] text-white shadow-xl shadow-[#1B365D]/30 transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:shadow-[#1B365D]/40 active:scale-95"
          title="Pokreni vodič"
        >
          <svg className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
