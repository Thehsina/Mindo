// src/redux/weeklyResetSelectors.js
import { createSelector } from "@reduxjs/toolkit";
import { formatLocalDate } from "../utils/dateUtils.js";

/**
 * Returns a Set of ISO date strings ("YYYY-MM-DD") representing the last 7 days including today.
 */
export const getLast7DateStrings = (refDate = new Date()) => {
  const dates = new Set();
  const base = new Date(refDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    dates.add(formatLocalDate(d));
  }
  return dates;
};

/**
 * Parses any incoming date representation into "YYYY-MM-DD".
 */
export const extractDateString = (dateVal) => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return formatLocalDate(parsed);
  }
  return null;
};

/**
 * Base Input Selectors
 */
export const selectTasksState = (state) => (Array.isArray(state?.tasks) ? state.tasks : []);
export const selectHabitsState = (state) => state?.habits?.habits || [];
export const selectCompletionsState = (state) => state?.habits?.completions || [];
export const selectExpensesState = (state) => (Array.isArray(state?.expenses) ? state.expenses : []);

/**
 * 1. TASKS SELECTORS: Total tasks completed in the last 7 days
 */
export const selectCompletedTasksLast7Days = createSelector(
  [selectTasksState],
  (tasks) => {
    const last7DaysSet = getLast7DateStrings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    cutoffDate.setHours(0, 0, 0, 0);

    return tasks.filter((t) => {
      const isDone = Boolean(t?.completed) || t?.status === "completed";
      if (!isDone) return false;

      // Check date signatures in order of precision
      const rawDate = t.completedAt || t.dueDate || t.due_date || t.updatedAt || t.createdAt;
      const cleanDate = extractDateString(rawDate);

      if (cleanDate && last7DaysSet.has(cleanDate)) {
        return true;
      }

      // If timestamp exists, compare against cutoffDate
      if (rawDate) {
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed >= cutoffDate;
        }
      }

      // Fallback: If marked completed without explicit dates, count as active completion
      return true;
    });
  }
);

export const selectTotalTasksCompletedCount = createSelector(
  [selectCompletedTasksLast7Days],
  (completedTasks) => completedTasks.length
);

export const selectWeeklyTasks = selectTotalTasksCompletedCount;

/**
 * Helper: Calculates current consecutive streak for a single habit
 */
export const calculateHabitStreak = (habit, completions = []) => {
  if (!habit || !habit.id) return 0;
  const habitCompletions = completions.filter(
    (c) => c && c.habitId === habit.id && Boolean(c.completed)
  );
  const completionDates = new Set(
    habitCompletions.map((c) => extractDateString(c.date)).filter(Boolean)
  );

  let streak = 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const WEEK_DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = formatLocalDate(checkDate);
    const dayName = WEEK_DAYS_SHORT[checkDate.getDay()];

    let isScheduled = true;
    if (habit.frequency === "weekdays") isScheduled = dayName !== "Sat" && dayName !== "Sun";
    else if (habit.frequency === "weekends") isScheduled = dayName === "Sat" || dayName === "Sun";
    else if (habit.frequency === "custom") isScheduled = (habit.customDays || []).includes(dayName);

    if (isScheduled) {
      if (completionDates.has(dateStr)) {
        streak++;
      } else {
        // Allow grace for today if not completed yet
        if (i > 0) break;
      }
    }
  }

  return streak;
};

/**
 * 2. HABITS SELECTORS: Highest habit streak & details
 */
export const selectHabitStreaksList = createSelector(
  [selectHabitsState, selectCompletionsState],
  (habits, completions) => {
    return habits
      .filter((h) => !h.paused)
      .map((habit) => ({
        id: habit.id,
        name: habit.name || "Untitled Habit",
        icon: habit.icon || "🎯",
        streak: calculateHabitStreak(habit, completions),
      }))
      .sort((a, b) => b.streak - a.streak);
  }
);

export const selectTopHabitDetails = createSelector(
  [selectHabitStreaksList],
  (streaksList) => {
    if (!streaksList.length) {
      return {
        highestStreak: 0,
        habitName: "No habits yet",
        habitIcon: "🎯",
        habitId: null,
      };
    }
    const top = streaksList[0];
    return {
      highestStreak: top.streak,
      habitName: top.name,
      habitIcon: top.icon,
      habitId: top.id,
    };
  }
);

export const selectHighestHabitStreak = createSelector(
  [selectTopHabitDetails],
  (top) => top.highestStreak
);

export const selectHighestStreak = selectHighestHabitStreak;

/**
 * 3. EXPENSES SELECTORS: Total money spent on groceries in the last 7 days
 */
export const selectWeeklyGroceryExpenses = createSelector(
  [selectExpensesState],
  (expenses) => {
    const last7DaysSet = getLast7DateStrings();

    return expenses.filter((e) => {
      if (!e) return false;
      const type = (e.type || e.transaction_type || "expense").toLowerCase();
      if (type === "income") return false;

      const category = (e.category || "").toLowerCase();
      const isGrocery = category === "groceries" || category === "grocery" || category.includes("grocer");
      if (!isGrocery) return false;

      const dateStr = extractDateString(e.date || e.created_at || e.createdAt);
      return dateStr ? last7DaysSet.has(dateStr) : false;
    });
  }
);

export const selectWeeklyGrocerySpend = createSelector(
  [selectWeeklyGroceryExpenses],
  (groceryExpenses) => {
    const total = groceryExpenses.reduce((sum, item) => {
      const val = typeof item.amount === "number" ? item.amount : parseFloat(item.amount) || 0;
      return sum + (Number.isNaN(val) ? 0 : val);
    }, 0);
    return Math.round(total * 100) / 100;
  }
);

export const selectWeeklyGroceryCurrency = createSelector(
  [selectWeeklyGroceryExpenses],
  (groceryExpenses) => {
    const firstWithCurr = groceryExpenses.find((e) => e && e.currency);
    return firstWithCurr?.currency || "AED";
  }
);

/**
 * 4. COMBINED SUMMARY SELECTOR FOR SUNDAY RESET
 */
export const selectSundayResetSummary = createSelector(
  [
    selectTotalTasksCompletedCount,
    selectTopHabitDetails,
    selectWeeklyGrocerySpend,
    selectWeeklyGroceryCurrency,
    selectCompletedTasksLast7Days,
    selectWeeklyGroceryExpenses,
  ],
  (tasksCount, topHabit, grocerySpend, currency, completedTasks, groceryExpenses) => {
    return {
      tasksCompleted: tasksCount,
      completedTasks,
      highestStreak: topHabit.highestStreak,
      topHabitName: topHabit.habitName,
      topHabitIcon: topHabit.habitIcon,
      grocerySpend,
      currency,
      groceryItemCount: groceryExpenses.length,
    };
  }
);
