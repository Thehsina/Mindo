// src/redux/habitsSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase.js";
import { addNotification, addReminderRecord, createReminderRecord } from "../utils/notifications.js";
import { formatLocalDate } from "../utils/dateUtils.js";

const DEFAULT_DEMO_HABITS = [];

const buildDemoCompletions = () => [];

const normalizeHabit = (h = {}) => ({
  id: h.id || `habit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: h.name || "Untitled Habit",
  icon: h.icon || "🎯",
  frequency: h.frequency || "daily",
  customDays: Array.isArray(h.customDays) ? h.customDays : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  target: h.target || "",
  reminderTime: h.reminderTime || "",
  paused: Boolean(h.paused),
  createdAt: h.createdAt || new Date().toISOString(),
});

const normalizeCompletion = (c = {}) => ({
  id: c.id || `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  habitId: c.habitId || "",
  date: c.date ? String(c.date).trim().slice(0, 10) : formatLocalDate(new Date()),
  completed: Boolean(c.completed),
  progressValue: c.progressValue ?? 1,
});

const deduplicateCompletions = (list = []) => {
  const map = new Map();
  for (const item of list) {
    if (!item || !item.habitId || !item.date) continue;
    const cleanDate = String(item.date).trim().slice(0, 10);
    const key = `${item.habitId}__${cleanDate}`;
    // If we haven't seen it yet, or if this one is marked completed
    if (!map.has(key) || item.completed) {
      map.set(key, normalizeCompletion({ ...item, date: cleanDate }));
    }
  }
  return Array.from(map.values());
};

const habitsSlice = createSlice({
  name: "habits",
  initialState: {
    habits: [],
    completions: [],
  },
  reducers: {
    setHabitsState: (state, action) => {
      state.habits = (action.payload.habits || []).map(normalizeHabit);
      state.completions = deduplicateCompletions(action.payload.completions || []);
    },
    addHabit: (state, action) => {
      state.habits.push(normalizeHabit(action.payload));
    },
    updateHabit: (state, action) => {
      const idx = state.habits.findIndex((h) => h.id === action.payload.id);
      if (idx !== -1) {
        state.habits[idx] = normalizeHabit({ ...state.habits[idx], ...action.payload });
      }
    },
    deleteHabit: (state, action) => {
      state.habits = state.habits.filter((h) => h.id !== action.payload);
      state.completions = state.completions.filter((c) => c.habitId !== action.payload);
    },
    toggleHabitCompletion: (state, action) => {
      const { habitId, date = formatLocalDate(new Date()), progressValue } = action.payload;
      const cleanDate = String(date).trim().slice(0, 10);
      const existingIdx = state.completions.findIndex((c) => c.habitId === habitId && c.date === cleanDate);

      if (existingIdx !== -1) {
        // Toggle completion
        if (state.completions[existingIdx].completed) {
          // Remove completion completely
          state.completions = state.completions.filter((c) => !(c.habitId === habitId && c.date === cleanDate));
        } else {
          state.completions[existingIdx].completed = true;
          if (progressValue !== undefined) {
            state.completions[existingIdx].progressValue = progressValue;
          }
        }
      } else {
        state.completions.push(
          normalizeCompletion({
            habitId,
            date: cleanDate,
            completed: true,
            progressValue: progressValue ?? 1,
          })
        );
      }
    },
    setHabitProgress: (state, action) => {
      const { habitId, date = formatLocalDate(new Date()), progressValue } = action.payload;
      const cleanDate = String(date).trim().slice(0, 10);
      const existingIdx = state.completions.findIndex((c) => c.habitId === habitId && c.date === cleanDate);

      if (existingIdx !== -1) {
        state.completions[existingIdx].progressValue = progressValue;
        state.completions[existingIdx].completed = progressValue > 0;
      } else {
        state.completions.push(
          normalizeCompletion({
            habitId,
            date: cleanDate,
            completed: progressValue > 0,
            progressValue,
          })
        );
      }
    },
  },
});

export const {
  setHabitsState,
  addHabit,
  updateHabit,
  deleteHabit,
  toggleHabitCompletion,
  setHabitProgress,
} = habitsSlice.actions;

export default habitsSlice.reducer;

// LocalStorage helpers
export const readLocalHabits = () => {
  try {
    const habitsRaw = localStorage.getItem("tm.habits");
    const compsRaw = localStorage.getItem("tm.habit_completions");

    if (!habitsRaw) {
      // Return default demo habits & completions
      const demoHabits = DEFAULT_DEMO_HABITS.map(normalizeHabit);
      const demoComps = buildDemoCompletions().map(normalizeCompletion);
      localStorage.setItem("tm.habits", JSON.stringify(demoHabits));
      localStorage.setItem("tm.habit_completions", JSON.stringify(demoComps));
      return { habits: demoHabits, completions: demoComps };
    }

    const habits = JSON.parse(habitsRaw).map(normalizeHabit);
    const completions = compsRaw ? JSON.parse(compsRaw).map(normalizeCompletion) : [];
    return { habits, completions };
  } catch (err) {
    console.error("Error reading local habits:", err);
    return { habits: DEFAULT_DEMO_HABITS.map(normalizeHabit), completions: buildDemoCompletions() };
  }
};

export const writeLocalHabits = (habits, completions) => {
  try {
    localStorage.setItem("tm.habits", JSON.stringify(habits.map(normalizeHabit)));
    localStorage.setItem("tm.habit_completions", JSON.stringify(completions.map(normalizeCompletion)));
  } catch (err) {
    console.error("Error writing local habits:", err);
  }
};

// Async thunks
export const fetchHabitsFirestore = () => async (dispatch, getState) => {
  try {
    if (!isSupabaseConfigured) {
      const local = readLocalHabits();
      dispatch(setHabitsState(local));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const local = readLocalHabits();
      dispatch(setHabitsState(local));
      return;
    }

    // Try fetching from Supabase
    const { data: habitsData, error: habitsErr } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id);

    if (habitsErr) {
      // Fallback if table doesn't exist
      const local = readLocalHabits();
      dispatch(setHabitsState(local));
      return;
    }

    const { data: compsData } = await supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id);

    const habits = (habitsData || []).map((row) =>
      normalizeHabit({
        id: row.id,
        name: row.name,
        icon: row.icon,
        frequency: row.frequency,
        customDays: row.custom_days,
        target: row.target,
        reminderTime: row.reminder_time,
        paused: row.paused,
        createdAt: row.created_at,
      })
    );

    const completions = (compsData || []).map((row) =>
      normalizeCompletion({
        id: row.id,
        habitId: row.habit_id,
        date: row.date,
        completed: row.completed,
        progressValue: row.progress_value,
      })
    );

    dispatch(setHabitsState({ habits, completions }));
  } catch (err) {
    console.error("Failed to fetch habits:", err);
    const local = readLocalHabits();
    dispatch(setHabitsState(local));
  }
};

export const addHabitFirestore = (habitData) => async (dispatch, getState) => {
  const newHabit = normalizeHabit(habitData);
  dispatch(addHabit(newHabit));

  // Handle optional reminder integration
  if (newHabit.reminderTime) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const rec = createReminderRecord({
      title: `${newHabit.icon} ${newHabit.name}`,
      date: todayStr,
      time: newHabit.reminderTime,
      notes: `Habit reminder: ${newHabit.target || "Time to complete your habit!"}`,
      repeat: newHabit.frequency === "daily" ? "Daily" : "Custom",
      relatedType: "habit",
      relatedId: newHabit.id,
      route: "/habits",
    });
    addReminderRecord(rec);
    addNotification({
      title: `Habit Reminder: ${newHabit.name}`,
      message: `Scheduled reminder at ${newHabit.reminderTime}`,
      type: "system",
      relatedItemType: "habit",
      relatedItemId: newHabit.id,
      scheduledAt: rec.scheduledAt,
      route: "/habits",
    });
  }

  const state = getState().habits;
  writeLocalHabits(state.habits, state.completions);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase.from("habits").insert([
          {
            id: newHabit.id,
            user_id: user.id,
            name: newHabit.name,
            icon: newHabit.icon,
            frequency: newHabit.frequency,
            custom_days: newHabit.customDays,
            target: newHabit.target,
            reminder_time: newHabit.reminderTime,
            paused: newHabit.paused,
          },
        ]);
      }
    } catch (err) {
      console.error("Supabase insert habit error:", err);
    }
  }
};

export const updateHabitFirestore = (habitData) => async (dispatch, getState) => {
  dispatch(updateHabit(habitData));
  const state = getState().habits;
  writeLocalHabits(state.habits, state.completions);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase
          .from("habits")
          .update({
            name: habitData.name,
            icon: habitData.icon,
            frequency: habitData.frequency,
            custom_days: habitData.customDays,
            target: habitData.target,
            reminder_time: habitData.reminderTime,
            paused: habitData.paused,
          })
          .eq("id", habitData.id)
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error("Supabase update habit error:", err);
    }
  }
};

export const deleteHabitFirestore = (habitId) => async (dispatch, getState) => {
  dispatch(deleteHabit(habitId));
  const state = getState().habits;
  writeLocalHabits(state.habits, state.completions);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase.from("habits").delete().eq("id", habitId).eq("user_id", user.id);
        await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("user_id", user.id);
      }
    } catch (err) {
      console.error("Supabase delete habit error:", err);
    }
  }
};

export const toggleHabitCompletionFirestore = (habitId, date, progressValue) => async (dispatch, getState) => {
  const cleanDate = date ? String(date).trim().slice(0, 10) : formatLocalDate(new Date());
  dispatch(toggleHabitCompletion({ habitId, date: cleanDate, progressValue }));
  const state = getState().habits;
  writeLocalHabits(state.habits, state.completions);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const comp = state.completions.find((c) => c.habitId === habitId && c.date === cleanDate);
        if (comp && comp.completed) {
          await supabase.from("habit_completions").upsert([
            {
              id: comp.id,
              user_id: user.id,
              habit_id: habitId,
              date: cleanDate,
              completed: true,
              progress_value: comp.progressValue,
            },
          ]);
        } else {
          await supabase
            .from("habit_completions")
            .delete()
            .eq("habit_id", habitId)
            .eq("date", cleanDate)
            .eq("user_id", user.id);
        }
      }
    } catch (err) {
      console.error("Supabase toggle completion error:", err);
    }
  }
};
