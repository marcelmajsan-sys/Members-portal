'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

interface PublicTicket {
  fullName: string;
  jobTitle: string | null;
  company: string | null;
  type: 'VIP' | 'STANDARD';
  checkedInAt: string | null;
  conference: { name: string; startDate: string; endDate: string; location: string | null };
  url: string;
  qr: string; // data:image/png;base64,...
}

function fmtDate(d: string) {
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('hr-HR');
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

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 px-4 py-10">
      <img src="/logo.png" alt="eCommerce Hrvatska" className="mb-8 h-9 w-auto" />

      {loading ? (
        <p className="text-gray-500">Učitavanje ulaznice...</p>
      ) : error || !ticket ? (
        <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🎫</p>
          <h1 className="mt-3 text-lg font-bold text-gray-900">Ulaznica nije dostupna</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      ) : (
        <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-primary px-6 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Ulaznica</p>
            <h1 className="mt-1 text-lg font-bold text-white">{ticket.conference.name}</h1>
            <p className="mt-1 text-xs text-white/80">
              {fmtDate(ticket.conference.startDate)}
              {ticket.conference.location && <> · {ticket.conference.location}</>}
            </p>
          </div>

          <div className="px-6 py-5 text-center">
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold tracking-wide ${ticket.type === 'VIP' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
              {ticket.type}
            </span>
            <p className="mt-3 text-xl font-bold text-gray-900">{ticket.fullName}</p>
            {ticket.jobTitle && <p className="text-sm text-gray-500">{ticket.jobTitle}</p>}
            {ticket.company && <p className="mt-1 text-sm font-medium text-gray-700">{ticket.company}</p>}
          </div>

          <div className="border-t border-dashed border-gray-200 px-6 py-6 text-center">
            {/* QR sadrži URL ove ulaznice — skenira se na ulazu */}
            <img src={ticket.qr} alt="QR kod ulaznice" className="mx-auto h-52 w-52" />
            <p className="mt-3 text-xs text-gray-400">Pokažite ovaj QR kod na ulazu.</p>
            {ticket.checkedInAt && (
              <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                Check-in obavljen {new Date(ticket.checkedInAt).toLocaleString('hr-HR')}
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-gray-400">Udruga eCommerce Hrvatska · udruga@ecommerce.hr</p>
    </div>
  );
}
