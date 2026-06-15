'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; role: string };
}

interface TaskDetail {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: { id: string; firstName: string; lastName: string; email: string; role: string };
  createdBy?: { id: string; firstName: string; lastName: string; email: string; role: string };
  dueAt?: string;
  createdAt: string;
  updatedAt: string;
  comments: TaskComment[];
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'Za napraviti',
  IN_PROGRESS: 'U tijeku',
  DONE: 'Završeno',
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  DONE: 'bg-green-50 text-green-700',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Nizak',
  MEDIUM: 'Srednji',
  HIGH: 'Visok',
  URGENT: 'Hitno',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-orange-50 text-orange-700',
  URGENT: 'bg-red-50 text-red-700',
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params.id as string;

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const isOwner = user?.role === 'OWNER';
  const isAssignee = task?.assignedTo?.id === user?.id;

  const fetchTask = useCallback(async () => {
    const res = await api.get<TaskDetail>(`/api/os/tasks/${id}`);
    if (res.success && res.data) {
      setTask(res.data);
    } else {
      setError(res.error?.message || 'Zadatak nije pronađen');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  async function changeStatus(newStatus: TaskStatus) {
    setActionLoading(newStatus);
    const res = await api.patch<TaskDetail>(`/api/os/tasks/${id}/status`, { status: newStatus });
    if (res.success) {
      await fetchTask(); // refetch full task with updated status
    }
    setActionLoading('');
  }

  async function handleComment() {
    if (!comment.trim()) return;
    setSendingComment(true);
    const res = await api.post<TaskComment>(`/api/os/tasks/${id}/comments`, { content: comment });
    if (res.success && res.data) {
      setTask((prev) => prev ? { ...prev, comments: [...prev.comments, res.data!] } : prev);
      setComment('');
    }
    setSendingComment(false);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
          &larr; Natrag
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
          {error || 'Zadatak nije pronađen'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button onClick={() => router.push('/tasks')} className="text-sm text-primary hover:underline">
        &larr; Natrag na zadatke
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            {task.description && (
              <p className="mt-2 text-sm text-gray-600">{task.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_STYLES[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
          </div>
        </div>

        {/* Status banner */}
        {task.status === 'TODO' && (
          <div className="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            Zadatak čeka preuzimanje
          </div>
        )}
        {task.status === 'IN_PROGRESS' && task.assignedTo && (
          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            Preuzeo/la: <strong>{task.assignedTo.firstName} {task.assignedTo.lastName}</strong>
          </div>
        )}
        {task.status === 'DONE' && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Završeno {task.assignedTo && <>— {task.assignedTo.firstName} {task.assignedTo.lastName}</>}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm">
          <div>
            <span className="text-gray-500">Kreirao/la:</span>{' '}
            <span className="font-medium text-gray-900">
              {task.createdBy ? `${task.createdBy.firstName} ${task.createdBy.lastName}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Dodijeljeno:</span>{' '}
            <span className="font-medium text-gray-900">
              {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Nije dodijeljeno'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Kreirano:</span>{' '}
            <span className="font-medium text-gray-900">
              {new Date(task.createdAt).toLocaleDateString('hr-HR')}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Rok:</span>{' '}
            <span className={`font-medium ${task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'DONE' ? 'text-red-600' : 'text-gray-900'}`}>
              {task.dueAt ? new Date(task.dueAt).toLocaleDateString('hr-HR') : '—'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          {/* Preuzmi — for assignee when TODO */}
          {task.status === 'TODO' && (isAssignee || isOwner) && (
            <button
              onClick={() => changeStatus('IN_PROGRESS')}
              disabled={!!actionLoading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {actionLoading === 'IN_PROGRESS' ? 'Preuzimanje...' : 'Preuzmi zadatak'}
            </button>
          )}

          {/* Završi — when IN_PROGRESS */}
          {task.status === 'IN_PROGRESS' && (isAssignee || isOwner) && (
            <button
              onClick={() => changeStatus('DONE')}
              disabled={!!actionLoading}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'DONE' ? '...' : 'Označi kao završeno'}
            </button>
          )}

          {/* Vrati — when DONE or IN_PROGRESS */}
          {task.status === 'DONE' && isOwner && (
            <button
              onClick={() => changeStatus('TODO')}
              disabled={!!actionLoading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Vrati na Za napraviti
            </button>
          )}

          {task.status === 'IN_PROGRESS' && isOwner && (
            <button
              onClick={() => changeStatus('TODO')}
              disabled={!!actionLoading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Vrati na Za napraviti
            </button>
          )}

          {/* Edit — OWNER only */}
          {isOwner && (
            <button
              onClick={() => router.push(`/tasks?edit=${task.id}`)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Uredi
            </button>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            Komentari ({task.comments.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {task.comments.length === 0 && (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              Nema komentara. Započnite razgovor o ovom zadatku.
            </p>
          )}

          {task.comments.map((c) => (
            <div key={c.id} className="px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {c.user.firstName[0]}{c.user.lastName[0]}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {c.user.firstName} {c.user.lastName}
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleString('hr-HR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <p className="mt-2 pl-10 text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>

        {/* New comment */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Napišite komentar..."
              rows={2}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
            />
            <button
              onClick={handleComment}
              disabled={sendingComment || !comment.trim()}
              className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light disabled:opacity-50"
            >
              {sendingComment ? '...' : 'Pošalji'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">Enter za slanje, Shift+Enter za novi red</p>
        </div>
      </div>
    </div>
  );
}
