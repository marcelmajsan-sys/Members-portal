'use client';

import { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string;
  assignedTo?: { firstName: string; lastName: string };
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  location: string | null;
  isAutomationTrigger: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  DONE: 'bg-green-100 text-green-700 border-green-200',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
  TODO: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_DOT: Record<string, string> = {
  DONE: 'bg-green-500',
  IN_PROGRESS: 'bg-yellow-500',
  OVERDUE: 'bg-red-500',
  TODO: 'bg-gray-400',
};

const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

function getEffectiveStatus(task: CalendarTask): string {
  if (task.status === 'DONE') return 'DONE';
  if (task.status === 'IN_PROGRESS') {
    if (task.dueAt && new Date(task.dueAt) < new Date()) return 'OVERDUE';
    return 'IN_PROGRESS';
  }
  if (task.dueAt && new Date(task.dueAt) < new Date()) return 'OVERDUE';
  return 'TODO';
}

const emptyEvent: Omit<CalendarEvent, 'id'> = {
  title: '',
  description: null,
  date: '',
  endDate: null,
  location: null,
  isAutomationTrigger: false,
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [triggerLoading, setTriggerLoading] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function fetchData() {
    const [tasksRes, eventsRes] = await Promise.all([
      api.get<CalendarTask[]>('/api/os/tasks?page=1&limit=100'),
      api.get<CalendarEvent[]>('/api/os/calendar-events'),
    ]);

    if (tasksRes.success && tasksRes.data) {
      let data = tasksRes.data;
      if (user?.role === 'OPERATOR') {
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        data = data.filter(
          (t) =>
            t.assignedTo &&
            `${t.assignedTo.firstName} ${t.assignedTo.lastName}` ===
              `${currentUser.firstName} ${currentUser.lastName}`
        );
      }
      setTasks(data);
    }

    if (eventsRes.success && eventsRes.data) {
      setEvents(eventsRes.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = startDow - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({
        date: d.toISOString().split('T')[0],
        day: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push({
        date: date.toISOString().split('T')[0],
        day: d,
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          date: d.toISOString().split('T')[0],
          day: d.getDate(),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    tasks.forEach((task) => {
      if (!task.dueAt) return;
      const dateKey = task.dueAt.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(task);
    });
    return map;
  }, [tasks]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      const dateKey = ev.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(ev);
    });
    return map;
  }, [events]);

  const selectedTasks = selectedDay ? (tasksByDate[selectedDay] || []) : [];
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] || []) : [];
  const today = new Date().toISOString().split('T')[0];

  const monthName = currentDate.toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  function openCreateEvent(dateStr?: string) {
    setEditingEvent(null);
    setEventForm({
      ...emptyEvent,
      date: dateStr || new Date().toISOString().split('T')[0],
    });
    setShowEventForm(true);
  }

  function openEditEvent(ev: CalendarEvent) {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title,
      description: ev.description,
      date: ev.date.split('T')[0],
      endDate: ev.endDate ? ev.endDate.split('T')[0] : null,
      location: ev.location,
      isAutomationTrigger: ev.isAutomationTrigger,
    });
    setShowEventForm(true);
  }

  async function handleSaveEvent() {
    if (!eventForm.title.trim() || !eventForm.date) return;
    setSaving(true);

    const payload = {
      title: eventForm.title,
      description: eventForm.description || null,
      date: eventForm.date,
      endDate: eventForm.endDate || null,
      location: eventForm.location || null,
      isAutomationTrigger: eventForm.isAutomationTrigger,
    };

    let res;
    if (editingEvent) {
      res = await api.put(`/api/os/calendar-events/${editingEvent.id}`, payload);
    } else {
      res = await api.post('/api/os/calendar-events', payload);
    }

    if (res.success) {
      showToast(editingEvent ? 'Događaj ažuriran!' : 'Događaj kreiran!');
      setShowEventForm(false);
      setEditingEvent(null);
      fetchData();
    } else {
      showToast(`Greška: ${res.error?.message || 'Nepoznata greška'}`);
    }
    setSaving(false);
  }

  async function handleDeleteEvent(id: string) {
    if (!confirm('Obrisati ovaj događaj?')) return;
    const res = await api.del(`/api/os/calendar-events/${id}`);
    if (res.success) {
      showToast('Događaj obrisan');
      fetchData();
    }
  }

  async function handleTriggerEvent(ev: CalendarEvent) {
    if (!confirm(`Pokrenuti automatizaciju za "${ev.title}"? Email će biti poslan svim aktivnim članovima koji su ciljani automatizacijom.`)) return;
    setTriggerLoading(ev.id);
    const res = await api.post<{ triggered: number }>(`/api/os/calendar-events/${ev.id}/trigger`);
    if (res.success && res.data) {
      showToast(`Automatizacija pokrenuta za ${res.data.triggered} članova`);
    } else {
      showToast(`Greška: ${res.error?.message || 'Nepoznata greška'}`);
    }
    setTriggerLoading('');
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Učitavanje kalendara...</p>
      </div>
    );
  }

  const isOwner = user?.role === 'OWNER';

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kalendar</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          {isOwner && (
            <button
              onClick={() => openCreateEvent(selectedDay || undefined)}
              className="rounded-lg bg-[#1B365D] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#152a4a] sm:px-4 sm:py-2"
            >
              + Novi događaj
            </button>
          )}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={prevMonth}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 sm:px-3"
            >
              &larr;
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold capitalize text-gray-900 sm:min-w-[160px]">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50 sm:px-3"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Event creation/edit form */}
      {showEventForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingEvent ? 'Uredi događaj' : 'Novi događaj'}
            </h2>
            <button
              onClick={() => { setShowEventForm(false); setEditingEvent(null); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Odustani
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Naziv događaja</label>
              <input
                type="text"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="npr. Webinar — Digital Marketing"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Datum</label>
                <input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Datum završetka (opcionalno)</label>
                <input
                  type="date"
                  value={eventForm.endDate || ''}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value || null })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Opis (opcionalno)</label>
              <textarea
                rows={3}
                value={eventForm.description || ''}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value || null })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lokacija (opcionalno)</label>
              <input
                type="text"
                value={eventForm.location || ''}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value || null })}
                placeholder="npr. Hotel Westin, Zagreb"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-[#1B365D] focus:ring-2 focus:ring-[#1B365D]/20"
              />
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <input
                type="checkbox"
                id="isAutomationTrigger"
                checked={eventForm.isAutomationTrigger}
                onChange={(e) => setEventForm({ ...eventForm, isAutomationTrigger: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
              />
              <div>
                <label htmlFor="isAutomationTrigger" className="text-sm font-medium text-blue-900">
                  Koristi kao okidač za automatizaciju
                </label>
                <p className="mt-0.5 text-xs text-blue-700">
                  Označite ovo ako želite da se ovaj događaj pojavi kao opcija u automatizacijama.
                  Tada možete kreirati automatizaciju koja šalje pozivnicu ili obavijest članovima za ovaj događaj.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 pt-4">
              <button
                onClick={() => { setShowEventForm(false); setEditingEvent(null); }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                Odustani
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={saving || !eventForm.title.trim() || !eventForm.date}
                className="rounded-lg bg-[#1B365D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#152a4a] disabled:opacity-60"
              >
                {saving ? 'Spremanje...' : editingEvent ? 'Spremi promjene' : 'Kreiraj događaj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((d, idx) => {
            const dayTasks = tasksByDate[d.date] || [];
            const dayEvents = eventsByDate[d.date] || [];
            const isToday = d.date === today;
            const isSelected = d.date === selectedDay;
            const totalItems = dayTasks.length + dayEvents.length;

            return (
              <div
                key={idx}
                onClick={() => setSelectedDay(d.date === selectedDay ? null : d.date)}
                className={`min-h-[52px] cursor-pointer border-b border-r border-gray-100 p-1 transition hover:bg-gray-50 sm:min-h-[80px] sm:p-1.5 ${
                  !d.isCurrentMonth ? 'bg-gray-50/50' : ''
                } ${isSelected ? 'bg-primary/5 ring-1 ring-primary/30' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      isToday
                        ? 'bg-primary text-white'
                        : d.isCurrentMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                    }`}
                  >
                    {d.day}
                  </span>
                  {totalItems > 0 && (
                    <span className="text-[10px] font-medium text-gray-400">
                      {totalItems}
                    </span>
                  )}
                </div>
                {/* Mobile: just dots */}
                {totalItems > 0 && (
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                    ))}
                    {dayTasks.slice(0, 3 - Math.min(dayEvents.length, 3)).map((task) => (
                      <span key={task.id} className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT[getEffectiveStatus(task)]}`} />
                    ))}
                  </div>
                )}
                {/* Desktop: dots + titles */}
                <div className="mt-1 hidden space-y-0.5 sm:block">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div key={ev.id} className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                      <span className="truncate text-[10px] font-medium text-blue-700">
                        {ev.title}
                      </span>
                    </div>
                  ))}
                  {dayTasks.slice(0, dayEvents.length > 0 ? 1 : 3).map((task) => {
                    const status = getEffectiveStatus(task);
                    return (
                      <div key={task.id} className="flex items-center gap-1">
                        <span className={`inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_DOT[status]}`} />
                        <span className="truncate text-[10px] text-gray-600">
                          {task.title}
                        </span>
                      </div>
                    );
                  })}
                  {totalItems > 3 && (
                    <p className="text-[10px] text-gray-400">+{totalItems - 3} više</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
      {selectedDay && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {new Date(selectedDay + 'T00:00:00').toLocaleDateString('hr-HR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
            {isOwner && (
              <button
                onClick={() => openCreateEvent(selectedDay)}
                className="text-sm font-medium text-[#1B365D] hover:underline"
              >
                + Dodaj događaj
              </button>
            )}
          </div>

          {/* Events for selected day */}
          {selectedEvents.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase text-blue-600">Događaji</p>
              <div className="space-y-2">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-blue-200 bg-blue-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-blue-900">{ev.title}</h3>
                          {ev.isAutomationTrigger && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                              Automatizacija
                            </span>
                          )}
                        </div>
                        {ev.description && (
                          <p className="mt-1 text-xs text-blue-700">{ev.description}</p>
                        )}
                        {ev.location && (
                          <p className="mt-1 text-xs text-blue-600">
                            <span className="font-medium">Lokacija:</span> {ev.location}
                          </p>
                        )}
                      </div>
                      {isOwner && (
                        <div className="flex gap-1">
                          {ev.isAutomationTrigger && (
                            <button
                              onClick={() => handleTriggerEvent(ev)}
                              disabled={triggerLoading === ev.id}
                              className="rounded-lg border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                              title="Pokreni automatizaciju"
                            >
                              {triggerLoading === ev.id ? '...' : 'Pokreni'}
                            </button>
                          )}
                          <button
                            onClick={() => openEditEvent(ev)}
                            className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs text-blue-700 hover:bg-blue-100"
                          >
                            Uredi
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(ev.id)}
                            className="rounded-lg border border-blue-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50"
                          >
                            Obriši
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks for selected day */}
          {selectedTasks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Zadaci</p>
              <div className="space-y-2">
                {selectedTasks.map((task) => {
                  const status = getEffectiveStatus(task);
                  return (
                    <div
                      key={task.id}
                      className={`rounded-lg border p-3 ${STATUS_COLORS[status]}`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">{task.title}</h3>
                        <span className="text-[10px] font-semibold uppercase">
                          {status === 'DONE' ? 'Završeno' : status === 'IN_PROGRESS' ? 'U tijeku' : status === 'OVERDUE' ? 'Zakašnjelo' : 'Za napraviti'}
                        </span>
                      </div>
                      {task.assignedTo && (
                        <p className="mt-1 text-xs opacity-75">
                          {task.assignedTo.firstName} {task.assignedTo.lastName}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedEvents.length === 0 && selectedTasks.length === 0 && (
            <p className="text-sm text-gray-400">Nema stavki za ovaj dan</p>
          )}
        </div>
      )}

      {/* Upcoming events with automation trigger */}
      {events.filter((e) => e.isAutomationTrigger).length > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-medium text-blue-900">Događaji s automatizacijom</p>
          <p className="mb-3 text-xs text-blue-700">
            Ovi događaji su dostupni kao okidači u automatizacijama. Možete ih koristiti za slanje pozivnica ili obavijesti članovima.
          </p>
          <div className="space-y-1.5">
            {events.filter((e) => e.isAutomationTrigger).map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium text-blue-900">{ev.title}</span>
                  <span className="text-xs text-blue-600">
                    {new Date(ev.date).toLocaleDateString('hr-HR')}
                  </span>
                </div>
                {isOwner && (
                  <button
                    onClick={() => handleTriggerEvent(ev)}
                    disabled={triggerLoading === ev.id}
                    className="rounded-lg bg-[#1B365D] px-3 py-1 text-xs font-medium text-white hover:bg-[#152a4a] disabled:opacity-50"
                  >
                    {triggerLoading === ev.id ? 'Šaljem...' : 'Pokreni'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
