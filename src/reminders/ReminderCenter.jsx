import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import Toast from "../components/Notification";

function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function loadFiredMap() {
  try {
    const raw = localStorage.getItem("tm.reminders.fired");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveFiredMap(map) {
  try {
    localStorage.setItem("tm.reminders.fired", JSON.stringify(map));
  } catch {
    // ignore
  }
}

export default function ReminderCenter() {
  const tasks = useSelector((state) => state.tasks);
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const pendingReminders = useMemo(() => {
    const now = new Date();
    return (tasks || [])
      .filter((t) => !t.completed)
      .map((t) => ({ task: t, remindAt: safeParseDate(t.remindAt) }))
      .filter(({ remindAt }) => remindAt && remindAt <= now)
      .sort((a, b) => a.remindAt - b.remindAt);
  }, [tasks]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const fired = loadFiredMap();

      for (const { task } of pendingReminders) {
        const key = `${task.id}:${task.remindAt || ""}`;
        if (fired[key]) continue;

        fired[key] = now;
        saveFiredMap(fired);

        const message = task.priority?.toLowerCase() === "high"
          ? `High priority reminder: ${task.title}`
          : `Reminder: ${task.title}`;

        setToast(message);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(""), 5000);

        if ("Notification" in window && window.Notification.permission === "granted") {
          try {
            new window.Notification("Task reminder", {
              body: message,
            });
          } catch {
            // ignore
          }
        }

        // Fire one per tick so we don't spam.
        break;
      }
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [pendingReminders]);

  return <Toast message={toast} />;
}

