'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import MemberTickets from '../../members/[id]/MemberTickets';

interface LeadDetail {
  id: string;
  isLead: boolean;
  memberType: string;
  memberTier: string;
  leadNote: string | null;
  website: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  company: {
    name: string;
    oib: string;
    phone: string | null;
    website: string | null;
  } | null;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: { firstName: string; lastName: string };
}

const TYPE_LABELS: Record<string, string> = {
  WEB_TRADER: 'Web trgovac',
  SERVICE_PROVIDER: 'Nuditelj usluga',
  PHYSICAL: 'Fizička osoba',
};
const TIER_LABELS: Record<string, string> = { FREE: 'Besplatno', STANDARD: 'Standard', PREMIUM: 'Premium' };

// Profil leada — namjerno reduciran: samo osnovni podaci, BILJEŠKE i ULAZNICE
export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Napomena (leadNote)
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Bilješke (MemberNote)
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteLoading, setEditNoteLoading] = useState(false);

  const [deleting, setDeleting] = useState(false);

  // Uređivanje podataka leada (koristi postojeći PATCH /members/:id/profile)
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', companyName: '', oib: '', website: '', memberType: 'WEB_TRADER' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  function openEdit() {
    if (!lead) return;
    setEditForm({
      firstName: lead.user.firstName,
      lastName: lead.user.lastName,
      email: lead.user.email,
      phone: lead.company?.phone || '',
      companyName: lead.company?.name || '',
      oib: lead.company?.oib || '',
      website: lead.website || lead.company?.website || '',
      memberType: lead.memberType,
    });
    setEditError('');
    setShowEdit(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || editSaving) return;
    setEditSaving(true);
    setEditError('');
    const res = await api.patch(`/api/os/members/${id}/profile`, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      email: editForm.email,
      phone: editForm.phone,
      companyName: editForm.companyName,
      oib: editForm.oib,
      memberType: editForm.memberType,
      // URL ide na webshop leada ako ga ima, inače na web tvrtke
      ...(lead.website ? { memberWebsite: editForm.website } : { companyWebsite: editForm.website }),
    });
    if (res.success) {
      setShowEdit(false);
      showToast('Podaci leada ažurirani');
      await fetchLead();
    } else {
      const raw = res.error?.message;
      setEditError(raw === 'EMAIL_TAKEN' || res.error?.code === 'EMAIL_TAKEN' ? 'Email adresa je već zauzeta' : raw || 'Greška pri spremanju');
    }
    setEditSaving(false);
  }

  const fetchLead = useCallback(async () => {
    const res = await api.get<LeadDetail>(`/api/os/members/${id}`);
    if (res.success && res.data) {
      if (!res.data.isLead) {
        // Nije lead — preusmjeri na puni profil člana
        router.replace(`/members/${id}`);
        return;
      }
      setLead(res.data);
    } else {
      setError(res.error?.message || 'Lead nije pronađen');
    }
    setLoading(false);
  }, [id, router]);

  const fetchNotes = useCallback(async () => {
    const res = await api.get<Note[]>(`/api/os/members/${id}/notes`);
    if (res.success && res.data) setNotes(res.data);
  }, [id]);

  useEffect(() => {
    fetchLead();
    fetchNotes();
  }, [fetchLead, fetchNotes]);

  async function saveLeadNote() {
    setNoteSaving(true);
    const res = await api.patch<{ leadNote: string | null }>(`/api/os/members/${id}/lead-note`, { leadNote: noteDraft });
    if (res.success) {
      setLead((l) => (l ? { ...l, leadNote: noteDraft.trim() || null } : l));
      setEditingNote(false);
      showToast('Napomena spremljena');
    } else {
      showToast(`Greška: ${res.error?.message || 'Spremanje nije uspjelo'}`);
    }
    setNoteSaving(false);
  }

  async function addNote() {
    if (!newNote.trim() || notesLoading) return;
    setNotesLoading(true);
    const res = await api.post<Note>(`/api/os/members/${id}/notes`, { content: newNote.trim() });
    if (res.success && res.data) {
      setNotes((prev) => [res.data!, ...prev]);
      setNewNote('');
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setNotesLoading(false);
  }

  async function saveNoteEdit(noteId: string) {
    if (!editNoteContent.trim() || editNoteLoading) return;
    setEditNoteLoading(true);
    const res = await api.patch<Note>(`/api/os/members/${id}/notes/${noteId}`, { content: editNoteContent.trim() });
    if (res.success && res.data) {
      setNotes((prev) => prev.map((n) => (n.id === noteId ? res.data! : n)));
      setEditingNoteId(null);
      setEditNoteContent('');
    } else {
      showToast(`Greška: ${res.error?.message || 'Spremanje nije uspjelo'}`);
    }
    setEditNoteLoading(false);
  }

  async function deleteNote(noteId: string) {
    if (!confirm('Obrisati bilješku?')) return;
    const res = await api.del(`/api/os/members/${id}/notes/${noteId}`);
    if (res.success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } else {
      showToast(`Greška: ${res.error?.message || 'Brisanje nije uspjelo'}`);
    }
  }

  async function deleteLead() {
    if (!lead) return;
    if (!confirm(`Obrisati lead ${lead.user.firstName} ${lead.user.lastName}? Brišu se i njegove bilješke.`)) return;
    setDeleting(true);
    const res = await api.del(`/api/os/members/${id}`);
    if (res.success) {
      router.push('/leads');
    } else {
      showToast(`Greška: ${res.error?.message || 'Brisanje nije uspjelo'}`);
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Učitavanje...</div>;
  }
  if (error || !lead) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-12 text-center text-red-600">{error || 'Lead nije pronađen'}</div>;
  }

  const website = lead.website || lead.company?.website;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            ← Leadovi
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {lead.user.firstName} {lead.user.lastName}
          </h1>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">LEAD</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openEdit}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Uredi podatke
          </button>
          <button
            onClick={deleteLead}
            disabled={deleting}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Brisanje...' : 'Obriši lead'}
          </button>
        </div>
      </div>

      {toast && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast}</div>}

      {/* Osnovni podaci */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
            <p className="mt-0.5 font-medium text-gray-900">{lead.user.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Tvrtka</p>
            <p className="mt-0.5 font-medium text-gray-900">{lead.company?.name || '—'}</p>
            {lead.company?.oib && <p className="text-xs text-gray-400">OIB: {lead.company.oib}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Telefon</p>
            <p className="mt-0.5 font-medium text-gray-900">{lead.company?.phone || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Kategorija</p>
            <p className="mt-0.5 font-medium text-gray-900">{TYPE_LABELS[lead.memberType] || lead.memberType} · {TIER_LABELS[lead.memberTier] || lead.memberTier}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Web</p>
            {website ? (
              <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-medium text-primary hover:underline">
                {website.replace(/^https?:\/\//, '').replace(/\/+$/, '')}
              </a>
            ) : (
              <p className="mt-0.5 font-medium text-gray-900">—</p>
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Dodan</p>
            <p className="mt-0.5 font-medium text-gray-900">{new Date(lead.createdAt).toLocaleDateString('hr-HR')}</p>
          </div>
        </div>

        {/* Napomena */}
        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Napomena</p>
            {!editingNote && (
              <button
                onClick={() => { setNoteDraft(lead.leadNote || ''); setEditingNote(true); }}
                className="text-xs font-medium text-primary hover:underline"
              >
                Uredi
              </button>
            )}
          </div>
          {editingNote ? (
            <div className="mt-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                autoFocus
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setEditingNote(false)} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-white">Odustani</button>
                <button onClick={saveLeadNote} disabled={noteSaving} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-light disabled:opacity-50">
                  {noteSaving ? '...' : 'Spremi'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{lead.leadNote || 'Nema napomene.'}</p>
          )}
        </div>
      </div>

      {/* Ulaznice (ako su dodane za ovog leada) */}
      <MemberTickets memberId={id} showQuota={false} />

      {/* Uredi podatke leada */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEdit(false)}>
          <form
            onSubmit={saveEdit}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-lg font-bold text-gray-900">Uredi podatke leada</h2>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Ime *</label>
                  <input required value={editForm.firstName} onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Prezime</label>
                  <input value={editForm.lastName} onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Email *</label>
                  <input required type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Telefon</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Naziv firme</label>
                  <input value={editForm.companyName} onChange={(e) => setEditForm(f => ({ ...f, companyName: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">OIB</label>
                  <input value={editForm.oib} onChange={(e) => setEditForm(f => ({ ...f, oib: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">URL</label>
                <input value={editForm.website} onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Tip (kategorija)</label>
                <select value={editForm.memberType} onChange={(e) => setEditForm(f => ({ ...f, memberType: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="WEB_TRADER">Web trgovac</option>
                  <option value="SERVICE_PROVIDER">Nuditelj usluga</option>
                  <option value="PHYSICAL">Fizička osoba</option>
                </select>
              </div>
              {editError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</p>}
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 p-4">
              <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Odustani</button>
              <button type="submit" disabled={editSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50">
                {editSaving ? 'Spremanje...' : 'Spremi promjene'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bilješke */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Bilješke</h2>
        </div>
        <div className="p-5">
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
              placeholder="Dodaj bilješku..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={addNote}
              disabled={notesLoading || !newNote.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {notesLoading ? '...' : 'Dodaj'}
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">Nema bilješki</p>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="group rounded-lg border border-gray-100 bg-gray-50 p-3">
                  {editingNoteId === note.id ? (
                    <div>
                      <textarea
                        value={editNoteContent}
                        onChange={(e) => setEditNoteContent(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingNoteId(null); setEditNoteContent(''); }}
                          className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
                        >
                          Odustani
                        </button>
                        <button
                          onClick={() => saveNoteEdit(note.id)}
                          disabled={editNoteLoading || !editNoteContent.trim()}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                        >
                          {editNoteLoading ? '...' : 'Spremi'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm text-gray-800">{note.content}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {note.author.firstName} {note.author.lastName} · {new Date(note.createdAt).toLocaleString('hr-HR')}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setEditingNoteId(note.id); setEditNoteContent(note.content); }}
                            className="text-xs text-gray-400 opacity-0 transition hover:text-primary group-hover:opacity-100"
                          >
                            Uredi
                          </button>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-xs text-red-400 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                          >
                            Obriši
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
