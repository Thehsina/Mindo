/**
 * Utility functions for Task date & time handling.
 */

/**
 * Builds a stored due date value.
 * - If dateEnabled is false or no dueDate is provided: returns null.
 * - If timeEnabled is false or no dueTime is provided: returns "YYYY-MM-DD" (date-only string).
 * - If timeEnabled is true and dueTime is provided: returns ISO string.
 */
export const buildDueDate = (dateEnabled, dueDate, timeEnabled, dueTime) => {
  if (!dateEnabled || !dueDate) return null;
  const cleanDate = String(dueDate).trim().slice(0, 10);
  if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return null;

  if (!timeEnabled || !dueTime) {
    return cleanDate;
  }

  const d = new Date(`${cleanDate}T${dueTime}:00`);
  if (Number.isNaN(d.getTime())) return cleanDate;
  return d.toISOString();
};

/**
 * Parses a task's stored dueDate and determines whether time was explicitly enabled.
 */
export const parseTaskDate = (dueDateVal, hasTimeFlag) => {
  if (!dueDateVal) {
    return { dateStr: "", timeStr: "", dateEnabled: false, timeEnabled: false };
  }

  const raw = String(dueDateVal).trim();
  if (!raw) {
    return { dateStr: "", timeStr: "", dateEnabled: false, timeEnabled: false };
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (isDateOnly) {
    return {
      dateStr: raw,
      timeStr: "",
      dateEnabled: true,
      timeEnabled: false,
    };
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: "", timeStr: "", dateEnabled: false, timeEnabled: false };
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}:${minutes}`;

  const hasTimePattern = raw.includes("T") || raw.includes(" ");
  const isNotMidnight = d.getHours() !== 0 || d.getMinutes() !== 0;

  const timeEnabled = hasTimeFlag !== undefined ? Boolean(hasTimeFlag) : Boolean(hasTimePattern && isNotMidnight);

  return {
    dateStr,
    timeStr: timeEnabled ? timeStr : "",
    dateEnabled: true,
    timeEnabled,
  };
};

/**
 * Formats a due date for display throughout the app.
 * If time is NOT added/enabled (date-only), returns only the date (e.g., "Today", "Tomorrow", "Oct 5, 2026").
 * If time IS added/enabled, returns date + time (e.g., "Today 2:30 PM", "Oct 5, 2026 2:30 PM").
 */
export const formatDue = (dueDateVal, hasTimeFlag) => {
  if (!dueDateVal) return "";
  const raw = String(dueDateVal).trim();
  if (!raw) return "";

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);

  let d;
  if (isDateOnly) {
    const [y, m, dNum] = raw.split("-").map(Number);
    d = new Date(y, m - 1, dNum);
  } else {
    d = new Date(raw);
  }

  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  const dateLabel =
    diffDays === 0
      ? "Today"
      : diffDays === 1
      ? "Tomorrow"
      : diffDays === -1
      ? "Yesterday"
      : d.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
        });

  let showTime = false;
  if (hasTimeFlag !== undefined) {
    showTime = Boolean(hasTimeFlag);
  } else if (!isDateOnly) {
    const hasTimePattern = raw.includes("T") || raw.includes(" ");
    const isNotMidnight = d.getHours() !== 0 || d.getMinutes() !== 0;
    showTime = hasTimePattern && isNotMidnight;
  }

  if (!showTime) {
    return dateLabel;
  }

  const timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
};
