const normalizeDateForInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

export const STORAGE_KEYS = {
  notifications: "tm.notifications",
  settings: "tm.notificationSettings",
  reminders: "tm.reminders",
  fired: "tm.notifications.fired",
};

export const defaultNotificationSettings = {
  enabled: true,
  taskReminders: true,
  groceryReminders: false,
  calendarReminders: true,
  morningSummary: false,
  eveningSummary: false,
  overdueReminders: true,
  defaultReminderTime: "08:00",
  notificationSound: true,
};

const safeRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const relativeTimeString = (value) => {
  if (!value) return "Today";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes <= 0) return "Now";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hr`;
  return `${Math.round(diffMinutes / 1440)} day`;
};

export const readNotificationSettings = () => {
  const saved = safeRead(STORAGE_KEYS.settings, defaultNotificationSettings);
  return { ...defaultNotificationSettings, ...saved };
};

export const saveNotificationSettings = (nextSettings) => {
  const merged = { ...defaultNotificationSettings, ...readNotificationSettings(), ...nextSettings };
  safeWrite(STORAGE_KEYS.settings, merged);
  return merged;
};

export const readNotifications = () => {
  const items = safeRead(STORAGE_KEYS.notifications, []);
  return Array.isArray(items) ? items : [];
};

export const writeNotifications = (items) => safeWrite(STORAGE_KEYS.notifications, items);

export const normalizeNotification = (input = {}) => {
  const timestamp = input.createdAt || new Date().toISOString();
  const scheduledAt = input.scheduledAt || timestamp;
  return {
    id: input.id || `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type || "system",
    title: input.title || "Mindo update",
    message: input.message || "",
    createdAt: timestamp,
    scheduledAt,
    read: Boolean(input.read),
    dismissed: Boolean(input.dismissed),
    relatedItemId: input.relatedItemId || null,
    relatedItemType: input.relatedItemType || null,
    snoozedUntil: input.snoozedUntil || null,
    repeatRule: input.repeatRule || null,
    route: input.route || null,
  };
};

export const addNotification = (input = {}) => {
  const items = readNotifications();
  const next = [normalizeNotification(input), ...items.filter((item) => item.id !== input.id)];
  writeNotifications(next);
  return next[0];
};

export const markNotificationRead = (notificationId) => {
  const items = readNotifications().map((item) =>
    item.id === notificationId ? { ...item, read: true } : item
  );
  writeNotifications(items);
  return items;
};

export const dismissNotification = (notificationId) => {
  const items = readNotifications().filter((item) => item.id !== notificationId);
  writeNotifications(items);
  return items;
};

export const markAllNotificationsRead = () => {
  const items = readNotifications().map((item) => ({ ...item, read: true }));
  writeNotifications(items);
  return items;
};

export const clearNotifications = () => {
  writeNotifications([]);
  return [];
};

export const getUnreadCount = (items = readNotifications()) =>
  items.filter((item) => !item.read && !item.dismissed).length;

export const getNotificationGroups = (items = readNotifications()) => {
  const active = items.filter((item) => !item.dismissed).sort((a, b) => new Date(b.scheduledAt || b.createdAt) - new Date(a.scheduledAt || a.createdAt));
  const today = [];
  const previous = [];

  const now = new Date();
  active.forEach((item) => {
    const date = new Date(item.scheduledAt || item.createdAt);
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) today.push(item);
    else previous.push(item);
  });

  return { today, previous };
};

export const parseReminderText = (input = "") => {
  const raw = String(input || "").trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const captured = raw.replace(/^remind me( to)?\s+/i, "").trim();
  const title = captured
    .replace(/\s+(at|on)\s+\d{1,2}\s*(am|pm)\b.*$/i, "")
    .replace(/\s+tomorrow\b.*$/i, "")
    .replace(/\s+every\s+[a-z]+\b.*$/i, "")
    .replace(/\s+morning\b.*$/i, "")
    .replace(/\s+evening\b.*$/i, "")
    .replace(/\s+today\b.*$/i, "")
    .trim();

  const timeMatch = lower.match(/(\d{1,2})(?::?(\d{2}))?\s*(am|pm)/i);
  const timeValue = timeMatch ? `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2] ? String(timeMatch[2]).padStart(2, "0") : "00"}` : null;

  let date = "";
  if (lower.includes("tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = d.toISOString().slice(0, 10);
  } else if (lower.includes("today")) {
    date = new Date().toISOString().slice(0, 10);
  }

  let repeat = "Never";
  if (lower.includes("every monday") || lower.includes("every monday to")) repeat = "Weekly";
  else if (lower.includes("every tuesday") || lower.includes("every wednesday") || lower.includes("every thursday") || lower.includes("every friday") || lower.includes("every saturday") || lower.includes("every sunday")) repeat = "Weekly";
  else if (/every month|monthly|1st of every month|on the 1st/.test(lower)) repeat = "Monthly";
  else if (/every day|daily/.test(lower)) repeat = "Daily";
  else if (/weekdays|weekday/.test(lower)) repeat = "Weekdays";

  if (!date && /next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|next sunday/.test(lower)) {
    const targetDay = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(lower.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)?.[1].toLowerCase() || "");
    if (targetDay !== -1) {
      const d = new Date();
      const current = d.getDay();
      const diff = (targetDay - current + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      date = d.toISOString().slice(0, 10);
    }
  }

  const defaultTime = timeValue || "09:00";
  const nextScheduledAt = new Date(`${date || new Date().toISOString().slice(0, 10)}T${defaultTime}:00`);

  return {
    id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || "New reminder",
    date: date || normalizeDateForInput(nextScheduledAt),
    time: timeValue || defaultTime,
    notes: raw,
    repeat,
    scheduledAt: nextScheduledAt.toISOString(),
    type: "reminder",
    relatedType: "reminder",
    relatedItemId: null,
  };
};

export const createReminderRecord = ({
  title,
  date,
  time,
  notes = "",
  repeat = "Never",
  relatedType = "reminder",
  relatedId = null,
  route = null,
}) => {
  const reminderDate = date || new Date().toISOString().slice(0, 10);
  const reminderTime = time || "09:00";
  const scheduledAt = new Date(`${reminderDate}T${reminderTime}:00`).toISOString();

  return {
    id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "reminder",
    title: title || "Reminder",
    message: notes || `${title || "Reminder"}`,
    createdAt: new Date().toISOString(),
    scheduledAt,
    read: false,
    dismissed: false,
    relatedItemId: relatedId,
    relatedItemType: relatedType,
    snoozedUntil: null,
    repeatRule: repeat,
    route,
    notes,
  };
};

export const readReminders = () => safeRead(STORAGE_KEYS.reminders, []);

export const saveReminders = (items) => safeWrite(STORAGE_KEYS.reminders, items);

export const addReminderRecord = (reminder) => {
  const items = readReminders();
  const next = [reminder, ...items];
  saveReminders(next);
  return next;
};

export const dismissReminderRecord = (id) => {
  const next = readReminders().filter((item) => item.id !== id);
  saveReminders(next);
  return next;
};

export const snoozeNotification = (notificationId, action) => {
  const items = readNotifications();
  const updated = items.map((item) => {
    if (item.id !== notificationId) return item;
    const base = new Date(item.scheduledAt || item.createdAt || Date.now());
    const later = new Date(base.getTime());

    if (action === "10 minutes") later.setMinutes(later.getMinutes() + 10);
    else if (action === "30 minutes") later.setMinutes(later.getMinutes() + 30);
    else if (action === "1 hour") later.setHours(later.getHours() + 1);
    else if (action === "Later today") later.setHours(18, 0, 0, 0);
    else if (action === "Tomorrow") {
      later.setDate(later.getDate() + 1);
      later.setHours(9, 0, 0, 0);
    } else if (action === "Custom") {
      later.setHours(later.getHours() + 2);
    }

    return { ...item, snoozedUntil: later.toISOString(), scheduledAt: later.toISOString(), read: true };
  });

  writeNotifications(updated);
  return updated;
};

export const requestBrowserNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  const permission = await window.Notification.requestPermission();
  return permission;
};

export const getBrowserNotificationPermission = () => {
  if (!("Notification" in window)) return "unsupported";
  return window.Notification.permission;
};

export const triggerBrowserNotification = (title, body) => {
  if (!("Notification" in window)) return false;
  if (window.Notification.permission !== "granted") return false;

  try {
    new window.Notification(title, { body });
    return true;
  } catch {
    return false;
  }
};

export const createSummaryNotification = ({ title, message, type = "daily-summary" }) =>
  normalizeNotification({ id: `summary-${Date.now()}`, type, title, message, scheduledAt: new Date().toISOString(), read: false });

export const readFiredMap = () => safeRead(STORAGE_KEYS.fired, {});

export const writeFiredMap = (items) => safeWrite(STORAGE_KEYS.fired, items);

export const markFired = (key) => {
  const map = readFiredMap();
  map[key] = Date.now();
  writeFiredMap(map);
  return map;
};

export const readNotificationSettingsWithDefaults = () => readNotificationSettings();

export const getDueTaskNotifications = (tasks = []) => {
  const settings = readNotificationSettings();
  if (!settings.enabled || !settings.taskReminders) return [];

  const result = [];
  const now = Date.now();

  tasks.forEach((task) => {
    if (!task || task.completed) return;
    const reminder = task.reminderAt || task.remindAt || task.dueDate;
    if (!reminder) return;

    const due = new Date(reminder);
    if (Number.isNaN(due.getTime())) return;
    if (due.getTime() <= now) {
      result.push({
        id: `task-reminder-${task.id}`,
        type: "task",
        title: `Reminder: ${task.title}`,
        message: task.note ? task.note : "Your task reminder is ready.",
        relatedItemId: task.id,
        relatedItemType: "task",
        scheduledAt: due.toISOString(),
        route: "/tasks",
      });
    }
  });

  return result;
};

export const getGroceryReminderNotification = (grocery = []) => {
  const settings = readNotificationSettings();
  if (!settings.enabled || !settings.groceryReminders) return null;
  const remaining = grocery.filter((item) => !item.completed);
  if (!remaining.length) return null;

  return {
    id: `grocery-reminder-${Date.now()}`,
    type: "grocery",
    title: "Grocery Reminder",
    message: `You still have ${remaining.length} grocery item${remaining.length > 1 ? "s" : ""} left on your list.`,
    relatedItemType: "grocery",
    relatedItemId: null,
    scheduledAt: new Date().toISOString(),
    route: "/grocery",
  };
};

export const getTaskSummaryLine = (tasks = []) => {
  const open = tasks.filter((task) => !task.completed);
  return open.length;
};

export const getNotificationMeta = (notification) => {
  const when = new Date(notification.scheduledAt || notification.createdAt || Date.now());
  return {
    short: when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    date: when.toLocaleDateString([], { month: "short", day: "numeric" }),
    relative: relativeTimeString(when.toISOString()),
  };
};
