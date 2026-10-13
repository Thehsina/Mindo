// src/pages/HabitsPage.jsx
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchHabitsFirestore,
  addHabitFirestore,
  updateHabitFirestore,
  deleteHabitFirestore,
  toggleHabitCompletionFirestore,
} from "../redux/habitsSlice";
import {
  Flame,
  Plus,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pause,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { formatLocalDate, getWeekDates, formatWeekRangeString } from "../utils/dateUtils";

const SUGGESTIONS = [
  { name: "Drink water", icon: "💧" },
  { name: "Exercise", icon: "🏃" },
  { name: "Read", icon: "📖" },
  { name: "Walk", icon: "🚶" },
  { name: "Meditate", icon: "🧘" },
  { name: "Journal", icon: "✍️" },
];

const EMOJI_OPTIONS = ["💧", "🏃", "📖", "🧘", "🌙", "🥗", "🎯", "💪", "🚲", "🍎", "🧠", "✍️", "🚶", "☕"];

const WEEK_DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getDayOfWeekName = (dateObj) => {
  const dayNum = dateObj.getDay();
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[dayNum];
};

const calculateStreak = (habit, completions = []) => {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id && c.completed);
  const completionDates = new Set(habitCompletions.map((c) => c.date));

  let streak = 0;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  for (let i = 0; i < 60; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = formatLocalDate(checkDate);
    const dayName = getDayOfWeekName(checkDate);

    let isScheduled = true;
    if (habit.frequency === "weekdays") isScheduled = dayName !== "Sat" && dayName !== "Sun";
    else if (habit.frequency === "weekends") isScheduled = dayName === "Sat" || dayName === "Sun";
    else if (habit.frequency === "custom") isScheduled = (habit.customDays || []).includes(dayName);

    if (isScheduled) {
      if (completionDates.has(dateStr)) {
        streak++;
      } else {
        if (i > 0) break;
      }
    }
  }

  return streak;
};

export default function HabitsPage() {
  const dispatch = useDispatch();
  const { habits = [], completions = [] } = useSelector((state) => state.habits || {});

  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [activeMenuHabitId, setActiveMenuHabitId] = useState(null);

  // Form State for Simple Add/Edit Flow
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [frequency, setFrequency] = useState("daily");
  const [customDays, setCustomDays] = useState(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [target, setTarget] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekRangeLabel = useMemo(() => formatWeekRangeString(weekDates, weekOffset), [weekDates, weekOffset]);

  useEffect(() => {
    dispatch(fetchHabitsFirestore());
  }, [dispatch]);

  const activeHabits = useMemo(() => habits.filter((h) => !h.paused), [habits]);
  const pausedHabits = useMemo(() => habits.filter((h) => h.paused), [habits]);

  // Calculate overall weekly completion count
  const weeklyProgress = useMemo(() => {
    let totalCells = 0;
    let completedCells = 0;

    activeHabits.forEach((habit) => {
      weekDates.forEach((d) => {
        const dateStr = formatLocalDate(d);
        const dayName = getDayOfWeekName(d);

        let isScheduled = true;
        if (habit.frequency === "weekdays") isScheduled = dayName !== "Sat" && dayName !== "Sun";
        else if (habit.frequency === "weekends") isScheduled = dayName === "Sat" || dayName === "Sun";
        else if (habit.frequency === "custom") isScheduled = (habit.customDays || []).includes(dayName);

        if (isScheduled) {
          totalCells++;
          const isDone = completions.some(
            (c) => c.habitId === habit.id && c.date === dateStr && c.completed
          );
          if (isDone) completedCells++;
        }
      });
    });

    return { totalCells, completedCells };
  }, [activeHabits, weekDates, completions]);

  const openCreateModal = () => {
    setEditingHabit(null);
    setName("");
    setIcon("🎯");
    setFrequency("daily");
    setCustomDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    setTarget("");
    setReminderTime("");
    setShowMoreOptions(false);
    setShowAddModal(true);
  };

  const openEditModal = (habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setIcon(habit.icon || "🎯");
    setFrequency(habit.frequency || "daily");
    setCustomDays(habit.customDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    setTarget(habit.target || "");
    setReminderTime(habit.reminderTime || "");
    setShowMoreOptions(true);
    setActiveMenuHabitId(null);
    setShowAddModal(true);
  };

  const handleSaveHabit = () => {
    if (!name.trim()) return;

    const payload = {
      id: editingHabit ? editingHabit.id : undefined,
      name: name.trim(),
      icon,
      frequency,
      customDays,
      target: target.trim(),
      reminderTime,
      paused: editingHabit ? editingHabit.paused : false,
    };

    if (editingHabit) {
      dispatch(updateHabitFirestore(payload));
    } else {
      dispatch(addHabitFirestore(payload));
    }

    setShowAddModal(false);
  };

  const handleSuggestionClick = (sugg) => {
    setName(sugg.name);
    setIcon(sugg.icon);
  };

  const toggleDayInCustom = (shortDay) => {
    setCustomDays((curr) =>
      curr.includes(shortDay) ? curr.filter((d) => d !== shortDay) : [...curr, shortDay]
    );
  };

  const toggleHabitDay = (habitId, dateStr) => {
    dispatch(toggleHabitCompletionFirestore(habitId, dateStr));
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-2 sm:gap-2.5 overflow-hidden select-none">
      {/* 1. COMPACT UNIFIED TOP HEADER */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Habits
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate">
              Daily routines & streaks
            </p>
          </div>
        </div>

        {/* Right Actions: Week Navigator + Add Habit */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Week Selector Pill */}
          <div className="flex items-center gap-0.5 rounded-xl bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-slate-800 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Previous week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-1 text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {weekRangeLabel}
            </span>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Next week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-500 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span className="hidden sm:inline">Add Habit</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN BENTO CONTAINER */}
      <div className="bento-card !p-2 sm:!p-3 rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs">
        {activeHabits.length === 0 && pausedHabits.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5">
              <Flame className="w-5 h-5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">
              Your routines start here.
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-3">
              Add a habit to begin tracking your weekly consistency.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-indigo-500 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Habit</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* DESKTOP MATRIX TABLE (MD and up) */}
            <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-y-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="py-2 px-3 sticky left-0 bg-white dark:bg-[#121214] z-10 w-48 sm:w-56 shadow-2xs">
                      Habit
                    </th>
                    {weekDates.map((d, i) => {
                      const dateStr = formatLocalDate(d);
                      const isToday = dateStr === todayStr;
                      const dayName = WEEK_DAYS_SHORT[i];
                      const dayNum = d.getDate();

                      return (
                        <th
                          key={dateStr}
                          className={`py-1.5 px-2 text-center transition-colors ${
                            isToday
                              ? "bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-t-xl"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold">
                              {isToday ? "TODAY" : dayName}
                            </span>
                            <span className="text-xs font-extrabold mt-0.5">{dayNum}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {activeHabits.map((habit) => {
                    const streak = calculateStreak(habit, completions);

                    return (
                      <tr key={habit.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1a1a1e]/40 transition-colors">
                        {/* Habit Title Column (Sticky) */}
                        <td className="py-2 px-3 sticky left-0 bg-white dark:bg-[#121214] z-10 w-48 sm:w-56 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm shrink-0">{habit.icon || "🎯"}</span>
                              <span
                                onClick={() => openEditModal(habit)}
                                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                              >
                                {habit.name}
                              </span>
                              {streak > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                                  🔥 {streak}d
                                </span>
                              )}
                            </div>

                            {/* Options Dropdown */}
                            <div className="relative shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuHabitId((prev) => (prev === habit.id ? null : habit.id))
                                }
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuHabitId === habit.id && (
                                <div className="absolute right-0 top-6 z-30 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-[#1a1a1e] space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(habit)}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-left cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      dispatch(updateHabitFirestore({ ...habit, paused: true }));
                                      setActiveMenuHabitId(null);
                                    }}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg text-left cursor-pointer"
                                  >
                                    <Pause className="w-3 h-3" />
                                    Pause
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      dispatch(deleteHabitFirestore(habit.id));
                                      setActiveMenuHabitId(null);
                                    }}
                                    className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg text-left cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 7 Checkboxes */}
                        {weekDates.map((d) => {
                          const dateStr = formatLocalDate(d);
                          const isToday = dateStr === todayStr;
                          const isDone = completions.some(
                            (c) => c.habitId === habit.id && c.date === dateStr && c.completed
                          );

                          return (
                            <td
                              key={dateStr}
                              className={`py-2 px-1 text-center align-middle transition-colors ${
                                isToday ? "bg-indigo-50/40 dark:bg-indigo-500/5" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => toggleHabitDay(habit.id, dateStr)}
                                className={`w-6 h-6 mx-auto rounded-lg flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                  isDone
                                    ? "bg-emerald-500 text-white shadow-2xs hover:bg-emerald-600 active:scale-95"
                                    : "border border-slate-300 dark:border-slate-700 text-transparent hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/30"
                                }`}
                                aria-label={`Toggle ${habit.name} for ${dateStr}`}
                              >
                                {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ""}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE HABIT CARDS VIEW (Fits 100% mobile screen width, NO horizontal table scrolling) */}
            <div className="block md:hidden flex-1 min-h-0 overflow-y-auto space-y-2 pt-1 no-scrollbar">
              {activeHabits.map((habit) => {
                const streak = calculateStreak(habit, completions);

                return (
                  <div
                    key={habit.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 dark:border-slate-800/80 dark:bg-[#16171a] shadow-2xs"
                  >
                    {/* Habit Title Row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{habit.icon || "🎯"}</span>
                        <span
                          onClick={() => openEditModal(habit)}
                          className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600"
                        >
                          {habit.name}
                        </span>
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1 py-0.5 rounded-md shrink-0">
                            🔥 {streak}d
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditModal(habit)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch(updateHabitFirestore({ ...habit, paused: true }))}
                          className="p-1 rounded-lg text-slate-400 hover:text-amber-600"
                          title="Pause"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => dispatch(deleteHabitFirestore(habit.id))}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* 7 Days Quick Check Buttons Row */}
                    <div className="grid grid-cols-7 gap-1 mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/60">
                      {weekDates.map((d, i) => {
                        const dateStr = formatLocalDate(d);
                        const isToday = dateStr === todayStr;
                        const isDone = completions.some(
                          (c) => c.habitId === habit.id && c.date === dateStr && c.completed
                        );

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => toggleHabitDay(habit.id, dateStr)}
                            className={`flex flex-col items-center justify-center py-1 rounded-lg text-center transition cursor-pointer ${
                              isDone
                                ? "bg-emerald-500 text-white shadow-2xs font-bold"
                                : isToday
                                ? "border border-indigo-400 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                : "bg-white dark:bg-[#1a1a1e] border border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                            }`}
                          >
                            <span className="text-[10px] leading-none font-bold">
                              {WEEK_DAYS_SHORT[i][0]}
                            </span>
                            <span className="text-[9px] mt-0.5 leading-none">
                              {isDone ? "✓" : d.getDate()}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matrix Footer Progress Summary */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="text-[11px]">Weekly Completion</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {weeklyProgress.completedCells} / {weeklyProgress.totalCells} ({weeklyProgress.totalCells ? Math.round((weeklyProgress.completedCells / weeklyProgress.totalCells) * 100) : 0}%)
              </span>
            </div>

            {/* Paused Habits List */}
            {pausedHabits.length > 0 && (
              <div className="pt-2 border-t border-dashed border-amber-200 dark:border-amber-500/20 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Paused Habits ({pausedHabits.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pausedHabits.map((h) => (
                    <div
                      key={h.id}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-xs font-semibold text-amber-800 dark:text-amber-300"
                    >
                      <span>{h.icon || "🎯"}</span>
                      <span className="truncate">{h.name}</span>
                      <button
                        type="button"
                        onClick={() => dispatch(updateHabitFirestore({ ...h, paused: false }))}
                        className="ml-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Resume
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ULTRA-SIMPLE ADD HABIT FLOW MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-[calc(100vw-24px)] max-w-md rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingHabit ? "Edit Habit" : "Add New Habit"}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 py-3">
              {/* STEP 1: What do you want to do regularly? */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Drink more water"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  autoFocus
                />

                {/* Quick suggestions */}
                {!editingHabit && (
                  <div className="mt-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Quick suggestions
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {SUGGESTIONS.map((sugg) => (
                        <button
                          key={sugg.name}
                          type="button"
                          onClick={() => handleSuggestionClick(sugg)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 transition cursor-pointer"
                        >
                          {sugg.icon} + {sugg.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: How often? */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Frequency
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "daily", label: "Every day" },
                    { id: "weekdays", label: "Weekdays" },
                    { id: "weekends", label: "Weekends" },
                    { id: "custom", label: "Custom" },
                  ].map((freq) => (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setFrequency(freq.id)}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        frequency === freq.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-[#1a1a1e] dark:text-slate-300 dark:border-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>

                {frequency === "custom" && (
                  <div className="mt-2 flex justify-between gap-1">
                    {WEEK_DAYS_SHORT.map((shortDay) => {
                      const isSel = customDays.includes(shortDay);
                      return (
                        <button
                          key={shortDay}
                          type="button"
                          onClick={() => toggleDayInCustom(shortDay)}
                          className={`h-7 w-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSel
                              ? "bg-indigo-600 text-white"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {shortDay[0]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* OPTIONAL MORE OPTIONS */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowMoreOptions((prev) => !prev)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {showMoreOptions ? "– Less options" : "+ More options (optional)"}
                </button>

                {showMoreOptions && (
                  <div className="mt-2.5 space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Icon
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => setIcon(e)}
                            className={`h-7 w-7 rounded-lg text-sm flex items-center justify-center transition cursor-pointer ${
                              icon === e
                                ? "bg-indigo-100 dark:bg-indigo-500/20 border-2 border-indigo-500"
                                : "bg-slate-100 dark:bg-slate-800"
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Target (optional)
                        </label>
                        <input
                          type="text"
                          value={target}
                          onChange={(e) => setTarget(e.target.value)}
                          placeholder="e.g. 8 glasses"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Reminder Time
                        </label>
                        <input
                          type="time"
                          value={reminderTime}
                          onChange={(e) => setReminderTime(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHabit}
                disabled={!name.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-2xs"
              >
                {editingHabit ? "Save Changes" : "Add Habit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
