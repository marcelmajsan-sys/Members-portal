'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface Announcement {
  id: string;
  content: string;
  isActive: boolean;
  updatedAt: string;
}

// Renderira tekst s inline markdown linkovima [tekst](url) u sigurne React čvorove.
// Sav ostali tekst je obični string (bez dangerouslySetInnerHTML → nema XSS-a).
// Dozvoljeni su samo http(s):// i mailto: linkovi.
function renderRichText(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) nodes.push(content.slice(last, m.index));
    const [, label, url] = m;
    const safe = /^(https?:\/\/|mailto:)/i.test(url);
    if (safe) {
      nodes.push(
        <a
          key={i++}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline underline-offset-2"
        >
          {label}
        </a>,
      );
    } else {
      // Nevaljan/nesiguran URL → prikaži samo tekst linka
      nodes.push(label);
    }
    last = re.lastIndex;
  }
  if (last < content.length) nodes.push(content.slice(last));
  return nodes;
}

export default function AnnouncementPage() {
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Pomoćnik za umetanje linka
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get<Announcement | null>('/api/os/announcement').then((res) => {
      if (res.success && res.data) {
        setContent(res.data.content);
        setIsActive(res.data.isActive);
      }
      setLoading(false);
    });
  }, []);

  function insertLink() {
    const text = linkText.trim();
    const url = linkUrl.trim();
    if (!text || !url) {
      setFeedback({ ok: false, msg: 'Unesite i tekst i URL linka.' });
      return;
    }
    const normalizedUrl = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
    const snippet = `[${text}](${normalizedUrl})`;
    const el = textareaRef.current;
    if (el) {
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      const next = content.slice(0, start) + snippet + content.slice(end);
      setContent(next);
      // Vrati fokus i postavi caret iza umetnutog linka
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + snippet.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setContent((c) => c + snippet);
    }
    setLinkText('');
    setLinkUrl('');
    setFeedback(null);
  }

  async function save() {
    setSaving(true);
    setFeedback(null);
    const res = await api.put<Announcement>('/api/os/announcement', {
      content: content.trim(),
      isActive,
    });
    if (res.success) {
      setFeedback({ ok: true, msg: 'Obavijest je spremljena.' });
    } else {
      setFeedback({ ok: false, msg: res.error?.message || 'Spremanje nije uspjelo.' });
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="p-4 text-gray-500">Učitavanje...</div>;
  }

  const trimmed = content.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Obavijest članovima</h1>
        <p className="mt-1 text-sm text-gray-500">
          Traka koja se prikazuje na vrhu portala svim članovima. Članovi ju mogu zatvoriti klikom na X;
          svaka izmjena teksta ponovno prikazuje traku i onima koji su ju zatvorili.
        </p>
      </div>

      <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
        {/* Uključeno / isključeno */}
        <label className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${
              isActive ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
            aria-pressed={isActive}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-900">
            {isActive ? 'Prikazuje se članovima' : 'Isključeno (ne prikazuje se)'}
          </span>
        </label>

        {/* Tekst obavijesti */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Tekst obavijesti</label>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="npr. Nova CRO Commerce konferencija — prijavite se ovdje!"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-1 text-xs text-gray-400">{content.length}/2000 znakova</p>
        </div>

        {/* Pomoćnik za link */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Umetni link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Tekst linka"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={insertLink}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-light"
            >
              Umetni
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Link se umeće na mjesto pokazivača u tekstu kao{' '}
            <code className="rounded bg-gray-200 px-1">[tekst](url)</code>.
          </p>
        </div>

        {/* Pregled */}
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700">Pregled</p>
          {trimmed ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white">
              <span>{renderRichText(trimmed)}</span>
              <span className="shrink-0 text-white/70">✕</span>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-400">
              Unesite tekst za pregled.
            </div>
          )}
        </div>

        {feedback && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              feedback.ok
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-red-200 bg-red-50 text-red-600'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-light disabled:opacity-60"
          >
            {saving ? 'Spremanje...' : 'Spremi'}
          </button>
        </div>
      </div>
    </div>
  );
}
