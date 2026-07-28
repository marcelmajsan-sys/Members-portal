'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface EmailDetail {
  id: string;
  to: string;
  subject: string;
  body: string | null;
  templateName: string | null;
  status: string;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  metadata: { offerId?: string; offerNumber?: string; attachments?: string[] } | null;
  member: {
    id: string;
    user: { firstName: string; lastName: string | null; email: string };
    company: { name: string } | null;
  } | null;
}

const TEMPLATE_LABELS: Record<string, string> = {
  renewal_confirmation: 'Potvrda produženja',
  renewal_reminder: 'Podsjetnik za obnovu',
  renewal_urgent: 'Podsjetnik za obnovu (14 dana)',
  renewal_final: 'Podsjetnik za obnovu (7 dana)',
  renewal_expiry_today: 'Podsjetnik — ističe danas',
  free_upgrade: 'Ponuda za upgrade',
  custom_notification: 'Obavijest',
  offer_step_1: '1. obavijest + predračun',
  offer_step_2: '2. obavijest + predračun',
  welcome: 'Dobrodošlica',
  expired: 'Istek članstva',
};

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<EmailDetail>(`/api/os/emails/${id}`).then((res) => {
      if (res.success && res.data) setEmail(res.data);
      else setError(res.error?.message || 'Email nije pronađen');
      setLoading(false);
    });
  }, [id]);

  async function downloadOfferPDF(offerId: string, offerNumber: string) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/os/offers/${offerId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (!res.ok) throw new Error('Failed to download');
      const json = await res.json();
      const byteChars = atob(json.data.base64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Predracun-${offerNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Greška pri preuzimanju PDF-a');
    }
  }

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><p className="text-gray-500">Učitavanje...</p></div>;
  }

  if (error || !email) {
    return (
      <div className="rounded-xl border border-danger bg-danger-light p-4 text-sm text-danger">
        {error || 'Email nije pronađen'}
      </div>
    );
  }

  const memberName = email.member
    ? `${email.member.user.firstName} ${email.member.user.lastName ?? ''}`.trim()
    : null;
  const attachmentNames = email.metadata?.attachments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          ← Natrag
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Poslani email</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white">
        {/* Header s podacima */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">{email.subject}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span>
              Primatelj:{' '}
              {email.member ? (
                <button
                  onClick={() => router.push(`/members/${email.member!.id}`)}
                  className="font-medium text-primary hover:underline"
                >
                  {memberName}{email.member.company ? ` (${email.member.company.name})` : ''}
                </button>
              ) : null}
              {' '}<span className="text-gray-400">&lt;{email.to}&gt;</span>
            </span>
            <span className="text-gray-400">{new Date(email.sentAt).toLocaleString('hr-HR')}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {email.templateName && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                {TEMPLATE_LABELS[email.templateName] ?? email.templateName}
              </span>
            )}
            {email.openedAt && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600" title={`Otvoreno: ${new Date(email.openedAt).toLocaleString('hr-HR')}`}>
                Otvoreno
              </span>
            )}
            {email.clickedAt && (
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600" title={`Kliknuto: ${new Date(email.clickedAt).toLocaleString('hr-HR')}`}>
                Kliknuto
              </span>
            )}
          </div>
        </div>

        {/* Prilozi */}
        {attachmentNames.length > 0 && (
          <div className="border-b border-gray-200 bg-gray-50/60 px-6 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Prilozi</p>
            <div className="flex flex-wrap gap-2">
              {attachmentNames.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    if (email.metadata?.offerId && email.metadata?.offerNumber) {
                      downloadOfferPDF(email.metadata.offerId, email.metadata.offerNumber);
                    }
                  }}
                  disabled={!email.metadata?.offerId}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-default disabled:opacity-60"
                >
                  <span aria-hidden>📎</span>
                  {name}
                  {email.metadata?.offerId && <span className="text-xs text-primary">Preuzmi</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sadržaj emaila */}
        {email.body ? (
          <iframe
            srcDoc={email.body}
            className="h-[70vh] w-full rounded-b-xl border-0"
            sandbox="allow-same-origin"
            title="Pregled emaila"
          />
        ) : (
          <p className="px-6 py-10 text-center text-sm text-gray-400">Sadržaj emaila nije spremljen</p>
        )}
      </div>
    </div>
  );
}
