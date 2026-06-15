'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface EmployeeFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const EMPTY_FORM: EmployeeFormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  OPERATOR: 'Operator',
};

const ROLE_STYLES: Record<string, string> = {
  OWNER: 'bg-purple-50 text-purple-700',
  OPERATOR: 'bg-blue-50 text-blue-600',
};

export default function TeamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // Edit state
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Password state
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

  // Confirm deactivate
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const fetchEmployees = useCallback(async () => {
    const res = await api.get<Employee[]>('/api/os/employees');
    if (res.success && res.data) {
      setEmployees(res.data);
    } else {
      setError(res.error?.message || 'Greška pri učitavanju');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  async function handleCreate() {
    if (!form.email.trim() || !form.password.trim() || !form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    const res = await api.post<Employee>('/api/os/employees', form);
    if (res.success && res.data) {
      setEmployees((prev) => [...prev, res.data!]);
      setShowModal(false);
      setForm(EMPTY_FORM);
      showToast('Zaposlenik kreiran');
    } else {
      setError(res.error?.message || 'Greška pri kreiranju');
    }
    setSaving(false);
  }

  async function handleDeactivate(id: string) {
    const res = await api.del(`/api/os/employees/${id}`);
    if (res.success) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: false } : e)));
      showToast('Zaposlenik deaktiviran');
    }
    setConfirmDeactivate(null);
  }

  async function handleReactivate(id: string) {
    const res = await api.patch<Employee>(`/api/os/employees/${id}`, { isActive: true });
    if (res.success && res.data) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? res.data! : e)));
      showToast('Zaposlenik reaktiviran');
    }
  }

  async function handleEditSave(id: string) {
    setEditLoading(true);
    const res = await api.patch<Employee>(`/api/os/employees/${id}`, editForm);
    if (res.success && res.data) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? res.data! : e)));
      showToast('Podaci ažurirani');
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setEditLoading(false);
  }

  async function handleRoleChange(id: string, role: string) {
    const res = await api.patch<Employee>(`/api/os/employees/${id}`, { role });
    if (res.success && res.data) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? res.data! : e)));
      showToast(`Rola promijenjena u ${ROLE_LABELS[role] || role}`);
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
  }

  async function handlePasswordChange(id: string) {
    if (passwordForm.password !== passwordForm.confirm) {
      showToast('Lozinke se ne podudaraju');
      return;
    }
    if (passwordForm.password.length < 6) {
      showToast('Lozinka mora imati najmanje 6 znakova');
      return;
    }
    setPasswordLoading(true);
    const res = await api.patch(`/api/os/employees/${id}/password`, { password: passwordForm.password });
    if (res.success) {
      showToast('Lozinka promijenjena');
      setShowPasswordFor(null);
      setPasswordForm({ password: '', confirm: '' });
    } else {
      showToast(`Greška: ${res.error?.message || 'Neuspjelo'}`);
    }
    setPasswordLoading(false);
  }

  function toggleExpand(emp: Employee) {
    if (expandedId === emp.id) {
      setExpandedId(null);
      setShowPasswordFor(null);
    } else {
      setExpandedId(emp.id);
      setEditForm({ firstName: emp.firstName, lastName: emp.lastName, email: emp.email });
      setShowPasswordFor(null);
      setPasswordForm({ password: '', confirm: '' });
    }
  }

  if (user?.role !== 'OWNER') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tim</h1>
          <p className="mt-1 text-sm text-gray-500">Upravljanje zaposlenicima</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link
            href="/team/analytics"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4"
          >
            Analitika
          </Link>
          <button
            onClick={() => {
              setForm(EMPTY_FORM);
              setShowModal(true);
            }}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-light sm:px-4"
          >
            + Dodaj zaposlenika
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger bg-danger-light p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div
              className="cursor-pointer p-5"
              onClick={() => toggleExpand(emp)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {emp.firstName} {emp.lastName}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">{emp.email}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_STYLES[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[emp.role] || emp.role}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      emp.isActive
                        ? 'bg-green-50 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {emp.isActive ? 'Aktivan' : 'Neaktivan'}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Pridružen: {new Date(emp.createdAt).toLocaleDateString('hr-HR')}
              </p>
            </div>

            {expandedId === emp.id && (
              <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                {/* Edit name & email */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Uredi podatke</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      placeholder="Ime"
                    />
                    <input
                      type="text"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      placeholder="Prezime"
                    />
                  </div>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    placeholder="Email"
                  />
                  <button
                    onClick={() => handleEditSave(emp.id)}
                    disabled={editLoading}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-light disabled:opacity-50"
                  >
                    {editLoading ? 'Spremanje...' : 'Spremi promjene'}
                  </button>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rola</p>
                  <div className="flex gap-2">
                    {(['OPERATOR', 'OWNER'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRoleChange(emp.id, r)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                          emp.role === r
                            ? 'bg-primary text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lozinka</p>
                  {showPasswordFor === emp.id ? (
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={passwordForm.password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder="Nova lozinka"
                      />
                      <input
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        placeholder="Potvrdi lozinku"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePasswordChange(emp.id)}
                          disabled={passwordLoading || !passwordForm.password}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-light disabled:opacity-50"
                        >
                          {passwordLoading ? 'Spremanje...' : 'Promijeni'}
                        </button>
                        <button
                          onClick={() => { setShowPasswordFor(null); setPasswordForm({ password: '', confirm: '' }); }}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Odustani
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPasswordFor(emp.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Promijeni lozinku
                    </button>
                  )}
                </div>

                {/* Activate / Deactivate */}
                <div className="border-t border-gray-100 pt-3">
                  {emp.isActive ? (
                    confirmDeactivate === emp.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Jeste li sigurni?</span>
                        <button
                          onClick={() => handleDeactivate(emp.id)}
                          className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                        >
                          Da, deaktiviraj
                        </button>
                        <button
                          onClick={() => setConfirmDeactivate(null)}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Ne
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeactivate(emp.id)}
                        className="text-xs text-danger hover:underline"
                      >
                        Deaktiviraj
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => handleReactivate(emp.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Reaktiviraj
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {employees.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm text-gray-400">Nema zaposlenika</p>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Dodaj zaposlenika</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ime</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Ime"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prezime</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Prezime"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="email@primjer.hr"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lozinka</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Lozinka"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.email.trim() || !form.password.trim() || !form.firstName.trim() || !form.lastName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light disabled:opacity-50"
              >
                {saving ? 'Spremanje...' : 'Kreiraj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
