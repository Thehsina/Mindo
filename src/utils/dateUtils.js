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

  // Handle UTC midnight timestamps (e.g. "2026-10-16T00:00:00.000Z") as date-only when time is not explicitly flagged
  const isUtcMidnight =
    (raw.includes("T00:00:00") || raw.includes(" 00:00:00")) &&
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0;

  if (isUtcMidnight && (hasTimeFlag === undefined || !hasTimeFlag)) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: "",
      dateEnabled: true,
      timeEnabled: false,
    };
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

  const parsed = parseTaskDate(raw, hasTimeFlag);
  if (!parsed.dateEnabled || !parsed.dateStr) return "";

  const [y, m, dNum] = parsed.dateStr.split("-").map(Number);
  const d = new Date(y, m - 1, dNum);
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

  if (!parsed.timeEnabled || !parsed.timeStr) {
    return dateLabel;
  }

  const [hStr, mStr] = parsed.timeStr.split(":");
  const hours = parseInt(hStr, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 || 12;
  return `${dateLabel} ${h12}:${mStr} ${ampm}`;
};

/**
 * Robust Calendar Date Comparison Helper.
 * Determines if a task's stored dueDate matches a target YYYY-MM-DD string.
 * Handles date-only strings, ISO strings, local timestamp parsing, and UTC conversions.
 */
export const isSameCalendarDate = (dueDateVal, targetDateStr) => {
  if (!dueDateVal || !targetDateStr) return false;
  const raw = String(dueDateVal).trim();
  if (!raw) return false;

  const targetClean = String(targetDateStr).trim().slice(0, 10);

  // 1. Direct prefix match (e.g. "2026-10-09", "2026-10-09T04:00", "2026-10-09 04:00")
  if (raw.startsWith(targetClean)) return true;

  // 2. Parse using local date conversion via parseTaskDate
  const parsed = parseTaskDate(raw);
  if (parsed.dateEnabled && parsed.dateStr === targetClean) return true;

  // 3. Fallback local Date object comparison
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (`${year}-${month}-${day}` === targetClean) return true;
  }

  return false;
};

/**
 * Returns formatted 12-hour time string (e.g., "4:00 AM") if task has a time set.
 */
export const formatTaskTime = (dueDateVal) => {
  if (!dueDateVal) return "";
  const parsed = parseTaskDate(dueDateVal);
  if (parsed.timeEnabled && parsed.timeStr) {
    const [hStr, mStr] = parsed.timeStr.split(":");
    const hours = parseInt(hStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${mStr} ${ampm}`;
  }
  return "";
};

export const getStartOfWeek = (dateInput = new Date()) => {
  let date;
  if (typeof dateInput === "string") {
    const clean = dateInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = new Date(dateInput);
  }

  if (Number.isNaN(date.getTime())) date = new Date();

  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(date.getFullYear(), date.getMonth(), diff);
  const year = mon.getFullYear();
  const month = String(mon.getMonth() + 1).padStart(2, "0");
  const dayStr = String(mon.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
};

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getWeekdayName = (dateInput = new Date()) => {
  let date;
  if (typeof dateInput === "string") {
    const clean = dateInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = new Date(dateInput);
  }

  if (Number.isNaN(date.getTime())) return "Monday";
  return DAYS_FULL[date.getDay()];
};

/**
 * Formats a Date object or date input as YYYY-MM-DD in the user's local timezone.
 * Avoids any UTC offset shifts (unlike .toISOString()).
 */
export const formatLocalDate = (dateInput = new Date()) => {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const clean = dateInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Returns 7 local Date objects for a given week offset (Monday through Sunday).
 * Uses local noon (12:00:00) to avoid any Daylight Saving Time transitions or UTC rollover.
 */
export const getWeekDates = (weekOffset = 0, referenceDate = new Date()) => {
  const ref = new Date(referenceDate);
  const day = ref.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(
    ref.getFullYear(),
    ref.getMonth(),
    ref.getDate() + diffToMonday + weekOffset * 7,
    12,
    0,
    0,
    0
  );

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i,
      12,
      0,
      0,
      0
    );
    dates.push(d);
  }
  return dates;
};

/**
 * Formats a week range string (e.g. "This Week · Oct 12–18", "Last Week · Oct 5–11", "Next Week · Oct 19–25")
 */
export const formatWeekRangeString = (dates, weekOffset = 0) => {
  if (!dates || dates.length < 7) return "";
  const start = dates[0];
  const end = dates[6];

  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  const rangeStr =
    startMonth === endMonth
      ? `${startMonth} ${startDay}–${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  if (weekOffset === 0) return `This Week · ${rangeStr}`;
  if (weekOffset === -1) return `Last Week · ${rangeStr}`;
  if (weekOffset === 1) return `Next Week · ${rangeStr}`;
  return rangeStr;
};


