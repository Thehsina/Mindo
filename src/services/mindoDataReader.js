/**
 * Unified Read-Only Mindo Data Access Layer
 * Reuses existing Redux store state / Supabase data / localStorage fallbacks.
 * Guarantees Sam reads the EXACT SAME data that Mindo UI pages display.
 */

import { STORAGE_KEYS } from "../utils/notifications";
import { isSameCalendarDate, formatTaskTime, parseTaskDate } from "../utils/dateUtils";

export const safeReadLocalStorage = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const getFallbackTasks = (tasks = []) => (tasks && tasks.length > 0 ? tasks : safeReadLocalStorage("tm.tasks", []));
export const getFallbackGrocery = (grocery = []) => (grocery && grocery.length > 0 ? grocery : safeReadLocalStorage("tm.grocery", []));
export const getFallbackNotes = (notes = []) => (notes && notes.length > 0 ? notes : safeReadLocalStorage("tm.notes", []));
export const getFallbackExpenses = (expenses = []) => (expenses && expenses.length > 0 ? expenses : safeReadLocalStorage("tm.expenses", []));
export const getFallbackMeals = (meals = []) => (meals && meals.length > 0 ? meals : safeReadLocalStorage("tm.meals", []));
export const getFallbackHabits = (habitsState = {}) => {
  const habitsList = Array.isArray(habitsState)
    ? habitsState
    : habitsState.habits && habitsState.habits.length > 0
    ? habitsState.habits
    : safeReadLocalStorage("tm.habits", []);
  const completionsList =
    habitsState.completions && habitsState.completions.length > 0
      ? habitsState.completions
      : safeReadLocalStorage("tm.habit_completions", []);
  return { habits: habitsList, completions: completionsList };
};
export const getFallbackReminders = (reminders = []) => (reminders && reminders.length > 0 ? reminders : safeReadLocalStorage("tm.reminders", []));

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getWeekdayName = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  return Number.isNaN(d.getTime()) ? "Monday" : DAYS_FULL[d.getDay()];
};

// 1. TASKS QUERIES
export const getTasksForDate = (tasks = [], dateStr = new Date().toISOString().slice(0, 10)) => {
  const source = getFallbackTasks(tasks);
  const todayStr = new Date().toISOString().slice(0, 10);
  return source.filter(
    (t) => !t.completed && (isSameCalendarDate(t.dueDate, dateStr) || (!t.dueDate && dateStr === todayStr))
  );
};

export const getOverdueTasks = (tasks = [], todayStr = new Date().toISOString().slice(0, 10)) => {
  const source = getFallbackTasks(tasks);
  return source.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    const parsed = parseTaskDate(t.dueDate);
    return parsed.dateEnabled && parsed.dateStr < todayStr;
  });
};

export const getTaskByKeyword = (tasks = [], keyword = "") => {
  const source = getFallbackTasks(tasks);
  const clean = keyword.toLowerCase().trim();
  if (!clean) return [];
  return source.filter(
    (t) => (t.title || "").toLowerCase().includes(clean) || (t.note || "").toLowerCase().includes(clean)
  );
};

// 2. NOTES QUERIES
export const getNotes = (notes = [], keyword = "") => {
  const clean = keyword.toLowerCase().trim();
  if (!clean) return notes.slice(0, 10);
  return notes.filter(
    (n) =>
      (n.heading || "").toLowerCase().includes(clean) ||
      (n.description || "").toLowerCase().includes(clean)
  );
};

// 3. GROCERY QUERIES
export const getGroceries = (grocery = [], keyword = "") => {
  const pending = grocery.filter((g) => !g.completed);
  const clean = keyword.toLowerCase().trim();
  if (!clean) return pending;
  return pending.filter((g) => (g.name || "").toLowerCase().includes(clean));
};

// 4. EXPENSES / MONEY QUERIES
export const getExpenses = (expenses = [], timeframe = "month", dateStr = new Date().toISOString().slice(0, 10)) => {
  const currentMonthStr = dateStr.slice(0, 7); // YYYY-MM

  if (timeframe === "today") {
    const todayExpenses = expenses.filter((e) => e.type !== "income" && e.date === dateStr);
    const totalSpent = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return { timeframe: "today", date: dateStr, items: todayExpenses, totalSpent };
  }

  const monthExpenses = expenses.filter((e) => e.type !== "income" && e.date?.startsWith(currentMonthStr));
  const monthIncome = expenses.filter((e) => e.type === "income" && e.date?.startsWith(currentMonthStr));
  const totalSpent = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalIncome = monthIncome.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return {
    timeframe: "month",
    month: currentMonthStr,
    totalSpent,
    totalIncome,
    itemCount: monthExpenses.length,
    recentExpenses: monthExpenses.slice(0, 10),
  };
};

// 5. MEALS QUERIES
export const getMealsForDate = (
  meals = [],
  dateStr = new Date().toISOString().slice(0, 10),
  requestedType = null
) => {
  const source = getFallbackMeals(meals);
  const targetDay = getWeekdayName(dateStr);
  const weekStart = getStartOfWeek(dateStr);

  return source.filter((m) => {
    const matchDay = (m.day || "").toLowerCase() === targetDay.toLowerCase();
    const matchWeek =
      !m.dateStr ||
      m.dateStr === weekStart ||
      isSameCalendarDate(m.dateStr, dateStr) ||
      isSameCalendarDate(m.dateStr, weekStart);
    const matchType = requestedType
      ? (m.type || "").toLowerCase() === requestedType.toLowerCase()
      : true;
    return matchDay && matchWeek && matchType;
  });
};

// 6. HABITS QUERIES
export const getHabitsForDate = (habitsState = {}, dateStr = new Date().toISOString().slice(0, 10)) => {
  const habitsList = Array.isArray(habitsState) ? habitsState : habitsState.habits || [];
  const completionsList = habitsState.completions || [];

  const dayCompletions = completionsList.filter((c) => c.date === dateStr && c.completed);
  const completedIds = new Set(dayCompletions.map((c) => c.habitId));

  const activeHabits = habitsList.filter((h) => !h.paused);
  const completed = activeHabits.filter((h) => completedIds.has(h.id));
  const remaining = activeHabits.filter((h) => !completedIds.has(h.id));

  return { activeHabits, completed, remaining };
};

// 7. REMINDERS QUERIES
export const getRemindersForDate = (reminders = [], dateStr = new Date().toISOString().slice(0, 10)) => {
  // If reminders is empty, check localStorage
  const source = reminders.length > 0 ? reminders : safeReadLocalStorage(STORAGE_KEYS.reminders, []);
  return source.filter(
    (r) => r.date === dateStr || r.scheduledAt?.startsWith(dateStr)
  );
};

// 8. COMBINED DAILY PLAN QUERY
export const getCombinedDailyPlan = (contextData = {}, dateStr = new Date().toISOString().slice(0, 10)) => {
  const tasks = getTasksForDate(contextData.tasks || [], dateStr);
  const reminders = getRemindersForDate(contextData.reminders || [], dateStr);
  const meals = getMealsForDate(contextData.meals || [], dateStr);
  const habits = getHabitsForDate(contextData.habits || {}, dateStr);

  return {
    dateStr,
    weekdayLabel: getWeekdayName(dateStr),
    tasks,
    reminders,
    meals,
    habitsRemaining: habits.remaining,
    hasAnyData: tasks.length > 0 || reminders.length > 0 || meals.length > 0 || habits.remaining.length > 0,
  };
};

// 9. COMBINED WEEKLY OVERVIEW QUERY
export const getWeeklyOverview = (contextData = {}, startDateStr = new Date().toISOString().slice(0, 10)) => {
  const days = [];
  const start = new Date(startDateStr + "T00:00:00");

  for (let i = 0; i < 7; i++) {
    const current = new Date(start);
    current.setDate(current.getDate() + i);
    const dStr = current.toISOString().slice(0, 10);
    const plan = getCombinedDailyPlan(contextData, dStr);
    days.push(plan);
  }

  return { startDateStr, days };
};

// MAIN UNIFIED QUERY DISPATCHER
export const executeMindoQuery = (intentType = "QUERY_DAILY_PLAN", queryParams = {}, contextData = {}) => {
  const dateStr = queryParams.dateStr || new Date().toISOString().slice(0, 10);
  const keyword = queryParams.keyword || "";

  switch (intentType) {
    case "QUERY_GROCERY": {
      const items = getGroceries(contextData.grocery || [], keyword);
      if (items.length === 0) return "Your grocery list is empty! No pending items.";
      return `🛒 Pending Grocery List (${items.length} items):\n\n` + items.map((g) => `• ${g.name} ${g.quantity ? `(${g.quantity})` : ""}`).join("\n");
    }

    case "QUERY_NOTES": {
      const notes = getNotes(contextData.notes || [], keyword);
      if (notes.length === 0) return `No notes found matching "${keyword || "your search"}".`;
      return `📝 Notes Found (${notes.length}):\n\n` + notes.map((n) => `• ${n.heading || "Note"}: ${n.description}`).join("\n");
    }

    case "QUERY_EXPENSES":
    case "QUERY_MONEY": {
      const exp = getExpenses(contextData.expenses || [], "month", dateStr);
      return `💰 Expenses for this month:\n• Total Spent: AED ${exp.totalSpent.toLocaleString()}\n• Total Income: AED ${exp.totalIncome.toLocaleString()}\n• Transactions: ${exp.itemCount}`;
    }

    case "QUERY_MEALS": {
      const requestedType = queryParams.mealType || null;
      const meals = getMealsForDate(contextData.meals || [], dateStr, requestedType);
      const dateLabel = queryParams.dateLabel || dateStr;

      if (meals.length === 0) {
        if (requestedType) {
          return `You don't have ${requestedType} planned for ${dateLabel}.`;
        }
        return `No meals are currently planned for ${dateLabel}.`;
      }

      if (requestedType && meals.length > 0) {
        const mealName = meals.map((m) => m.name).join(", ");
        return `${dateLabel === "Today" ? "Today" : dateLabel}'s ${requestedType} is **${mealName}**. 🍽`;
      }

      return `🍽 Planned Meals for ${dateLabel}:\n\n` + meals.map((m) => `• ${m.type ? m.type.toUpperCase() : "MEAL"}: ${m.name}`).join("\n");
    }

    case "QUERY_HABITS": {
      const habits = getHabitsForDate(contextData.habits || {}, dateStr);
      return `✓ Habits for ${queryParams.dateLabel || dateStr}:\n• Completed (${habits.completed.length}): ${habits.completed.map((h) => h.name).join(", ") || "None"}\n• Remaining (${habits.remaining.length}): ${habits.remaining.map((h) => h.name).join(", ") || "All done!"}`;
    }

    case "QUERY_REMINDERS": {
      const reminders = getRemindersForDate(contextData.reminders || [], dateStr);
      if (reminders.length === 0) return `You don't have any reminders set for ${queryParams.dateLabel || dateStr}.`;
      return `🔔 Reminders for ${queryParams.dateLabel || dateStr}:\n\n` + reminders.map((r) => `• ${r.title} — ${r.time || "09:00"}`).join("\n");
    }

    case "QUERY_TASKS": {
      const tasks = getTasksForDate(contextData.tasks || [], dateStr);
      if (tasks.length === 0) return `You don't have any tasks scheduled for ${queryParams.dateLabel || dateStr}.`;
      return `📋 Tasks for ${queryParams.dateLabel || dateStr} (${tasks.length}):\n\n` + tasks.map((t) => {
        const timeStr = formatTaskTime(t.dueDate);
        return timeStr ? `• ${t.title} (${timeStr})` : `• ${t.title}`;
      }).join("\n");
    }

    case "QUERY_WEEKLY": {
      const week = getWeeklyOverview(contextData, dateStr);
      const parts = week.days
        .filter((d) => d.hasAnyData)
        .map((d) => `📅 ${d.weekdayLabel} (${d.dateStr}):\n` + d.tasks.map((t) => {
          const timeStr = formatTaskTime(t.dueDate);
          return timeStr ? `  • Task: ${t.title} (${timeStr})` : `  • Task: ${t.title}`;
        }).join("\n") + (d.meals.length ? `\n` + d.meals.map((m) => `  • Meal: ${m.name}`).join("\n") : ""));
      if (parts.length === 0) return "You have a clear week ahead with no scheduled items!";
      return `📅 Weekly Overview:\n\n` + parts.join("\n\n");
    }

    case "QUERY_DAILY_PLAN":
    default: {
      const plan = getCombinedDailyPlan(contextData, dateStr);
      const parts = [];

      if (plan.tasks.length > 0) {
        parts.push(`📌 Tasks (${plan.tasks.length}):\n` + plan.tasks.map((t) => {
          const timeStr = formatTaskTime(t.dueDate);
          return timeStr ? `• ${t.title} (${timeStr})` : `• ${t.title}`;
        }).join("\n"));
      }

      if (plan.reminders.length > 0) {
        parts.push(`🔔 Reminders (${plan.reminders.length}):\n` + plan.reminders.map((r) => `• ${r.title} — ${r.time || "09:00"}`).join("\n"));
      }
      if (plan.meals.length > 0) {
        parts.push(`🍽 Meals:\n` + plan.meals.map((m) => `• ${m.type ? m.type.toUpperCase() : "MEAL"} — ${m.name}`).join("\n"));
      }
      if (plan.habitsRemaining.length > 0) {
        parts.push(`✓ Habits Left (${plan.habitsRemaining.length}):\n` + plan.habitsRemaining.map((h) => `• ${h.name}`).join("\n"));
      }

      if (parts.length === 0) {
        return `You don't have anything planned for ${queryParams.dateLabel || dateStr} (${dateStr}) yet.`;
      }

      return `Here's your plan for ${queryParams.dateLabel || dateStr}:\n\n${parts.join("\n\n")}`;
    }
  }
};
