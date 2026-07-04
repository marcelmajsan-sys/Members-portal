'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface PublicTicket {
  fullName: string;
  jobTitle: string | null;
  email: string;
  company: string | null;
  type: 'VIP' | 'STANDARD';
  checkedInAt: string | null;
  conference: { name: string; description: string | null; startDate: string; endDate: string; location: string | null };
  url: string;
  qr: string; // data:image/png;base64,...
}

const NAVY = '#0f172a';

function fmtDate(d: string) {
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}.`;
}

export default function TicketPage() {
  const params = useParams<{ token: string }>();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.token) return;
    (async () => {
      const res = await api.get<PublicTicket>(`/api/tickets/${params.token}`);
      if (res.success && res.data) setTicket(res.data);
      else setError(res.error?.message || 'Ulaznica nije pronađena.');
      setLoading(false);
    })();
  }, [params?.token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-500">
        Učitavanje ulaznice...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🎫</p>
          <h1 className="mt-3 text-lg font-bold text-gray-900">Ulaznica nije dostupna</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
        <p className="mt-8 text-sm text-gray-400">Udruga eCommerce Hrvatska · udruga@ecommerce.hr</p>
      </div>
    );
  }

  const c = ticket.conference;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-5xl">
        {/* Tamni okvir ulaznice s narančastim akcentom u gornjem desnom kutu */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 shadow-xl" style={{ backgroundColor: NAVY }}>
          <div className="absolute right-0 top-0 h-2.5 w-2/5 rounded-tr-2xl bg-gradient-to-r from-transparent via-orange-500 to-orange-600" />

          <div className="overflow-hidden rounded-lg bg-white">
            <div className="flex flex-col sm:flex-row">
              {/* Lijevo: podaci o konferenciji i osobi */}
              <div className="flex-1 p-6 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Ulaznica · Ticket</p>
                <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight sm:text-4xl" style={{ color: NAVY }}>
                  {c.name}
                </h1>
                <p className="mt-2 text-lg font-bold text-gray-800">{fmtDate(c.startDate)}</p>
                {c.location && <p className="text-gray-500">{c.location}</p>}
                {c.description && <p className="mt-0.5 font-semibold text-gray-700">{c.description}</p>}

                <span className={`mt-4 inline-block rounded-md border px-2.5 py-0.5 text-xs font-bold tracking-wide ${ticket.type === 'VIP' ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>
                  {ticket.type}
                </span>

                <div className="mt-5 space-y-2 text-gray-700">
                  {ticket.jobTitle && (
                    <p className="flex items-center gap-2.5">
                      <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
                      </svg>
                      {ticket.jobTitle}
                    </p>
                  )}
                  <p className="flex items-center gap-2.5">
                    <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    {ticket.email}
                  </p>
                  {ticket.company && (
                    <p className="flex items-center gap-2.5">
                      <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                      </svg>
                      {ticket.company}
                    </p>
                  )}
                </div>
              </div>

              {/* Desno: QR + vlasnik, odvojeno isprekidanom linijom */}
              <div className="flex flex-col items-center justify-center border-t border-dashed border-gray-300 p-6 sm:w-72 sm:border-l sm:border-t-0 sm:p-8">
                <img src={ticket.qr} alt="QR kod ulaznice" className="h-44 w-44" />
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-gray-400">Vlasnik ulaznice</p>
                <p className="mt-1 text-center text-lg font-bold text-gray-900">{ticket.fullName}</p>
                {ticket.checkedInAt && (
                  <p className="mt-3 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    Check-in obavljen {new Date(ticket.checkedInAt).toLocaleString('hr-HR')}
                  </p>
                )}
              </div>
            </div>

            {/* Napomena */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-sm leading-relaxed sm:px-8">
              <span className="text-gray-700">
                Ulaznica vrijedi za cijeli dan (uključujući party), glasi na ime i prezime i nije prenosiva.
                Ulaznicu je potrebno zamijeniti za akreditaciju na registracijskom pultu konferencije.{' '}
              </span>
              <span className="text-gray-400">
                The ticket is valid for all day (including party), it&apos;s under your name and it&apos;s not
                transferable. The ticket needs to be exchanged for a Conference pass at the registration desk.
              </span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">members.ecommerce.hr · {c.name}</p>
      </div>
    </div>
  );
}
