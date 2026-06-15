'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: { id: string; firstName: string; lastName: string };
  dueAt?: string;
  createdAt: string;
}

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string;
  assignedToId: string;
}

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'TODO', label: 'Za napraviti', color: 'border-t-gray-400' },
  { key: 'IN_PROGRESS', label: 'U tijeku', color: 'border-t-info' },
  { key: 'DONE', label: 'Završeno', color: 'border-t-success' },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-info-light text-info',
  HIGH: 'bg-warning-light text-warning',
  URGENT: 'bg-danger-light text-danger',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Nizak',
  MEDIUM: 'Srednji',
  HIGH: 'Visok',
  URGENT: 'Hitno',
};

const EMPTY_FORM: TaskFormData = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueAt: '',
  assignedToId: '',
};

export default function TasksPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOwner = user?.role === 'OWNER';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Fetch employees for assignment dropdown (OWNER only)
  useEffect(() => {
    if (!isOwner) return;
    async function fetchEmployees() {
      const res = await api.get<Employee[]>('/api/os/employees');
      if (res.success && res.data) {
        setEmployees(res.data.filter((e) => e.isActive));
      }
    }
    fetchEmployees();
  }, [isOwner]);

  const fetchTasks = useCallback(async () => {
    const res = await api.get<Task[]>('/api/os/tasks');
    if (res.success && res.data) {
      setTasks(res.data);
    } else {
      setError(res.error?.message || 'Greška pri učitavanju');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function openNew() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  // Open edit modal when ?edit=<id> is in URL
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === editId);
      if (task) {
        setEditingTask(task);
        setForm({
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueAt: task.dueAt ? task.dueAt.split('T')[0] : '',
          assignedToId: task.assignee?.id || '',
        });
        setShowModal(true);
        router.replace('/tasks');
      }
    }
  }, [searchParams, tasks, router]);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);

    const body = {
      ...form,
      dueAt: form.dueAt || undefined,
      assignedToId: form.assignedToId || undefined,
    };

    if (editingTask) {
      const res = await api.put<Task>(`/api/os/tasks/${editingTask.id}`, body);
      if (res.success && res.data) {
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? res.data! : t)));
      }
    } else {
      const res = await api.post<Task>('/api/os/tasks', body);
      if (res.success && res.data) {
        setTasks((prev) => [...prev, res.data!]);
      }
    }

    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete() {
    if (!editingTask) return;
    const res = await api.del(`/api/os/tasks/${editingTask.id}`);
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      setShowModal(false);
    }
  }

  async function changeStatus(task: Task, newStatus: TaskStatus) {
    const res = await api.patch<Task>(`/api/os/tasks/${task.id}`, { status: newStatus });
    if (res.success && res.data) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data! : t)));
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje zadataka...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isOwner ? 'Zadaci' : 'Moji zadaci'}</h1>
        {isOwner && (
          <button
            onClick={openNew}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light"
          >
            + Novi zadatak
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-danger bg-danger-light p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border border-gray-200 border-t-4 bg-gray-50 ${col.color}`}>
              <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-700">{col.label}</h2>
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500 shadow-sm">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2 px-3 pb-3">
                {colTasks.length === 0 && (
                  <p className="py-6 text-center text-xs text-gray-400">Nema zadataka</p>
                )}
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                      <span
                        className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[task.priority]}`}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    </div>

                    {task.assignee && (
                      <p className="text-xs text-gray-500">
                        {task.assignee.firstName} {task.assignee.lastName}
                      </p>
                    )}

                    {task.dueAt && (
                      <p className="mt-1 text-xs text-gray-400">
                        Rok: {new Date(task.dueAt).toLocaleDateString('hr-HR')}
                      </p>
                    )}

                    {/* Quick status buttons */}
                    <div className="mt-2 flex gap-1">
                      {col.key !== 'TODO' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            changeStatus(task, col.key === 'DONE' ? 'IN_PROGRESS' : 'TODO');
                          }}
                          className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200"
                        >
                          &larr;
                        </button>
                      )}
                      {col.key !== 'DONE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            changeStatus(task, col.key === 'TODO' ? 'IN_PROGRESS' : 'DONE');
                          }}
                          className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200"
                        >
                          &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              {editingTask ? 'Uredi zadatak' : 'Novi zadatak'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Naslov</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Naziv zadatka"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Opis</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Opis zadatka..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="TODO">Za napraviti</option>
                    <option value="IN_PROGRESS">U tijeku</option>
                    <option value="DONE">Završeno</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Prioritet</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="LOW">Nizak</option>
                    <option value="MEDIUM">Srednji</option>
                    <option value="HIGH">Visok</option>
                    <option value="URGENT">Hitno</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Rok</label>
                  <input
                    type="date"
                    value={form.dueAt}
                    onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Dodijeli</label>
                  <select
                    value={form.assignedToId}
                    onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Nije dodijeljeno</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                {editingTask && (
                  <button
                    onClick={handleDelete}
                    className="text-sm text-danger hover:underline"
                  >
                    Obriši
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  Odustani
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light disabled:opacity-50"
                >
                  {saving ? 'Spremanje...' : editingTask ? 'Spremi' : 'Kreiraj'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
