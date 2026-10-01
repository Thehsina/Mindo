import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Toast from "../components/Notification";
import {
  addNotification,
  createReminderRecord,
  readNotificationSettings,
  readNotifications,
  triggerBrowserNotification,
  writeFiredMap,
  readFiredMap,
} from "../utils/notifications";

function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function ReminderCenter() {
  const tasks = useSelector((state) => state.tasks);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const pendingReminders = useMemo(() => {
    const now = new Date();
    return (tasks || [])
      .filter((t) => !t.completed)
      .map((t) => ({
        task: t,
        remindAt: safeParseDate(t.remindAt || t.reminderAt || t.dueDate),
      }))
      .filter(({ remindAt }) => remindAt && remindAt <= now)
      .sort((a, b) => a.remindAt - b.remindAt);
  }, [tasks]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const fired = readFiredMap();
      const settings = readNotificationSettings();
      if (!settings.enabled) return;

      for (const { task } of pendingReminders) {
        const key = `${task.id}:${task.remindAt || task.reminderAt || task.dueDate || ""}`;
        if (fired[key]) continue;

        fired[key] = now;
        writeFiredMap(fired);

        const message = task.priority?.toLowerCase() === "high"
          ? `High priority reminder: ${task.title}`
          : `Reminder: ${task.title}`;

        addNotification({
          id: `task-reminder-${task.id}-${key}`,
          type: "task",
          title: "Task reminder",
          message,
          scheduledAt: new Date(task.remindAt || task.reminderAt || task.dueDate || Date.now()).toISOString(),
          relatedItemId: task.id,
          relatedItemType: "task",
          read: false,
          dismissed: false,
        });

        setToast(message);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(""), 5000);
        triggerBrowserNotification("Task reminder", message);
        break;
      }

      const savedNotifications = readNotifications();
      const reminderRecords = JSON.parse(localStorage.getItem("tm.reminders") || "[]");
      for (const record of reminderRecords) {
        const scheduled = new Date(record.scheduledAt || record.createdAt || 0).getTime();
        const key = `saved-reminder-${record.id}`;
        if (scheduled > now || savedNotifications.some((item) => item.id === record.id)) continue;
        if (fired[key]) continue;

        fired[key] = now;
        writeFiredMap(fired);

        const reminderBody = record.message || record.notes || record.title;
        const notification = createReminderRecord({
          title: record.title,
          date: new Date(record.scheduledAt).toISOString().slice(0, 10),
          time: new Date(record.scheduledAt).toTimeString().slice(0, 5),
          notes: reminderBody,
          relatedType: record.relatedItemType || "reminder",
          relatedId: record.relatedItemId || null,
        });

        addNotification({
          id: notification.id,
          type: "reminder",
          title: notification.title,
          message: reminderBody,
          scheduledAt: notification.scheduledAt,
          relatedItemId: notification.relatedItemId,
          relatedItemType: notification.relatedItemType,
          read: false,
          dismissed: false,
        });

        triggerBrowserNotification("Mindo reminder", reminderBody);
        setToast(`Reminder: ${record.title}`);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(""), 5000);
        break;
      }
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [pendingReminders]);

  return <Toast message={toast} />;
}

