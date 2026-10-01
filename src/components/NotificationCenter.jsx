import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing, CalendarClock, CheckCheck, Plus, Trash2, X } from "lucide-react";
import {
  addNotification,
  addReminderRecord,
  createReminderRecord,
  dismissNotification,
  getNotificationGroups,
  getUnreadCount,
  markNotificationRead,
  readNotifications,
  readNotificationSettings,
  writeNotifications,
} from "../utils/notifications";

const emptyForm = {
  title: "",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  notes: "",
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => readNotifications());
  const [settings, setSettings] = useState(() => readNotificationSettings());
  const [showComposer, setShowComposer] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const tick = () => {
      setNotifications(readNotifications());
      setSettings(readNotificationSettings());
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  const unreadCount = useMemo(() => getUnreadCount(notifications), [notifications]);
  const groups = useMemo(() => getNotificationGroups(notifications), [notifications]);

  const refresh = () => {
    setNotifications(readNotifications());
    setSettings(readNotificationSettings());
  };

  const handleDismiss = (id) => {
    const next = dismissNotification(id);
    setNotifications(next);
  };

  const handleRead = (id) => {
    const next = markNotificationRead(id);
    setNotifications(next);
  };

  const handleSaveReminder = () => {
    const title = form.title.trim();
    if (!title) return;

    const record = createReminderRecord({
      title,
      date: form.date,
      time: form.time,
      notes: form.notes,
      repeat: "Never",
      relatedType: "reminder",
      relatedId: null,
      route: "/tasks",
    });

    addReminderRecord(record);
    addNotification({
      title: "Reminder created",
      message: `${title} is scheduled for ${form.date} at ${form.time}.`,
      type: "system",
      relatedItemType: "reminder",
      relatedItemId: record.id,
      scheduledAt: record.scheduledAt,
      route: "/tasks",
    });

    setForm(emptyForm);
    setShowComposer(false);
    refresh();
  };

  const renderNotificationCard = (item) => (
    <div key={item.id} className={`rounded-2xl border p-3 ${item.read ? "border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60" : "border-indigo-200 bg-indigo-50/90 dark:border-indigo-500/30 dark:bg-indigo-500/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{item.message}</p>
        </div>
        <button type="button" onClick={() => handleDismiss(item.id)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Dismiss notification">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>{new Date(item.scheduledAt || item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
        {!item.read && (
          <button type="button" onClick={() => handleRead(item.id)} className="rounded-full border border-indigo-200 px-2 py-1 font-medium text-indigo-700 dark:border-indigo-500/40 dark:text-indigo-300">
            Mark read
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#17181c]/80 dark:text-slate-100 dark:hover:bg-[#1d1f24]"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-1 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[60] mt-3 w-[min(92vw,22rem)] rounded-3xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-[#111315]/95">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Close panel">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowComposer((current) => !current)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Add reminder
            </button>
          </div>

          {showComposer && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/80">
              <div className="space-y-2">
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#17181c] dark:text-white"
                  placeholder="Reminder title"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-[#17181c] dark:text-white"
                  />
                  <input
                    type="time"
                    value={form.time}
                    onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none dark:border-slate-700 dark:bg-[#17181c] dark:text-white"
                  />
                </div>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#17181c] dark:text-white"
                  placeholder="Optional note"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowComposer(false)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
                  <button type="button" onClick={handleSaveReminder} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Save reminder</button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <CalendarClock className="h-3.5 w-3.5" />
                Today
              </div>
              <div className="space-y-2">
                {groups.today.length ? groups.today.map(renderNotificationCard) : <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">No notifications today.</p>}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <CheckCheck className="h-3.5 w-3.5" />
                Previous
              </div>
              <div className="space-y-2">
                {groups.previous.length ? groups.previous.map(renderNotificationCard) : <p className="rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">No saved activity yet.</p>}
              </div>
            </div>
          </div>

          {settings && settings.enabled === false && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Notifications are currently paused in settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
