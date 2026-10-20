import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTasksFirestore, toggleTaskFirestore } from "../redux/tasksSlice";
import { fetchGroceryFirestore } from "../redux/grocerySlice";
import { fetchHabitsFirestore, toggleHabitCompletionFirestore } from "../redux/habitsSlice";
import { fetchMealsFirestore } from "../redux/mealsSlice";
import { CheckCircle2, Circle, AlertCircle, ListTodo, ArrowRight, Flame } from "lucide-react";
import { isSupabaseConfigured, getCurrentUser } from "../supabase";
import { formatLocalDate, parseTaskDate, isSameCalendarDate } from "../utils/dateUtils";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.tasks || []);
  const { habits = [], completions = [] } = useSelector((state) => state.habits || {});

  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      if (!isSupabaseConfigured) {
        const local = localStorage.getItem("tm.local_user");
        if (active) setUser(local ? JSON.parse(local) : { id: "local-user", email: "local@example.com", user_metadata: { display_name: "Local User" } });
        return;
      }

      const currentUser = await getCurrentUser();
      if (active) setUser(currentUser);
    };

    loadUser();
    dispatch(fetchTasksFirestore());
    dispatch(fetchGroceryFirestore());
    dispatch(fetchHabitsFirestore());
    dispatch(fetchMealsFirestore());

    return () => {
      active = false;
    };
  }, [dispatch]);

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const todayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date());
  const todayStr = formatLocalDate(new Date());

  const activeHabitsList = (habits || []).filter((h) => h.archived !== true);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active = tasks.filter((t) => !t.completed).length;

  const isTaskOverdue = (task) => {
    if (!task || task.completed || !task.dueDate) return false;
    const parsed = parseTaskDate(task.dueDate, task.hasTime ?? task.timeEnabled);
    if (!parsed.dateEnabled || !parsed.dateStr) return false;

    const now = new Date();
    const currentTodayStr = formatLocalDate(now);

    if (parsed.dateStr < currentTodayStr) {
      return true;
    }
    if (parsed.dateStr === currentTodayStr && parsed.timeEnabled && parsed.timeStr) {
      const currentHours = String(now.getHours()).padStart(2, "0");
      const currentMinutes = String(now.getMinutes()).padStart(2, "0");
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      return parsed.timeStr < currentTimeStr;
    }
    return false;
  };

  const highPriorityActive = tasks
    .filter((t) => !t.completed)
    .filter((t) => (t.priority || "").toLowerCase() === "high")
    .sort((a, b) => new Date(a.remindAt || 0) - new Date(b.remindAt || 0));

  const highPriority = highPriorityActive.length;
  const overdue = tasks.filter(isTaskOverdue).length;

  const todayTasks = tasks
    .filter((t) => !t.completed)
    .filter((t) => {
      if (!t.dueDate) return false;
      return isSameCalendarDate(t.dueDate, todayStr);
    });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="animate-fade-in-up h-full w-full flex flex-col justify-between gap-2 sm:gap-3 overflow-hidden select-none pr-0 sm:pr-0.5">
      {/* Top Header Row: Greeting & Date badge on exact same line */}
      <div className="shrink-0 flex items-center justify-between gap-3 w-full">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
            {getGreeting()}, {displayName.split(' ')[0]}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            Here's your productivity overview for today.
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#121214]/90 px-3 py-1 sm:px-3.5 sm:py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs shrink-0 whitespace-nowrap">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>• {todayLabel}</span>
        </div>
      </div>

      {/* Bento Stats Row: Compact single horizontal row */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
        <div className="bento-card !p-1.5 sm:!p-2.5 md:!p-3 bg-indigo-600 dark:bg-indigo-600 border-transparent text-white flex flex-col justify-between rounded-xl sm:rounded-2xl md:rounded-3xl min-w-0">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-indigo-100 text-[8px] sm:text-[10px] md:text-xs font-extrabold uppercase tracking-wider truncate">Total</span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 shrink-0">
              <ListTodo className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </div>
          </div>
          <span className="text-sm sm:text-xl md:text-2xl font-black leading-none">{total}</span>
        </div>

        <div className="bento-card !p-1.5 sm:!p-2.5 md:!p-3 flex flex-col justify-between rounded-xl sm:rounded-2xl md:rounded-3xl min-w-0">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[8px] sm:text-[10px] md:text-xs font-extrabold uppercase tracking-wider truncate">Done</span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <span className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none">{completed}</span>
        </div>

        <div className="bento-card !p-1.5 sm:!p-2.5 md:!p-3 flex flex-col justify-between rounded-xl sm:rounded-2xl md:rounded-3xl min-w-0">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[8px] sm:text-[10px] md:text-xs font-extrabold uppercase tracking-wider truncate">Active</span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <Circle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <span className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none">{active}</span>
        </div>

        <div className="bento-card !p-1.5 sm:!p-2.5 md:!p-3 flex flex-col justify-between rounded-xl sm:rounded-2xl md:rounded-3xl min-w-0">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[8px] sm:text-[10px] md:text-xs font-extrabold uppercase tracking-wider truncate">High</span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <span className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none">{highPriority}</span>
        </div>

        <div className="bento-card !p-1.5 sm:!p-2.5 md:!p-3 flex flex-col justify-between rounded-xl sm:rounded-2xl md:rounded-3xl min-w-0">
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[8px] sm:text-[10px] md:text-xs font-extrabold uppercase tracking-wider truncate">Overdue</span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg sm:rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shrink-0">
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>
          <span className="text-sm sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-none">{overdue}</span>
        </div>
      </div>

      {/* Main Tasks Grid: Dynamically stretches to fill remaining height, internally scrollable */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Today's Tasks Column */}
        <div className="bento-card !p-2.5 sm:!p-3 flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              Today’s Tasks
              <span className="text-xs font-semibold text-slate-400 ml-1">({todayTasks.length})</span>
            </h2>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {todayTasks.length === 0 ? (
              <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                All caught up for today!
              </div>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#1a1a1e] p-2 transition-all hover:bg-slate-100/80 dark:hover:bg-[#222226]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => dispatch(toggleTaskFirestore(task))}
                      className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition cursor-pointer"
                      aria-label="Toggle complete"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                      )}
                    </button>
                    <span className={`text-xs sm:text-sm font-semibold truncate ${task.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shrink-0 ml-2">
                    {task.priority || 'None'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Tasks Column */}
        <div className="bento-card !p-2.5 sm:!p-3 flex flex-col h-full min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5 shrink-0">
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              Priority Tasks
              <span className="text-xs font-semibold text-slate-400 ml-1">({highPriorityActive.length})</span>
            </h2>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {highPriorityActive.length === 0 ? (
              <div className="h-full flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                No high priority tasks!
              </div>
            ) : (
              highPriorityActive.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#1a1a1e] p-2 transition-all hover:bg-slate-100/80 dark:hover:bg-[#222226]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => dispatch(toggleTaskFirestore(task))}
                      className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition cursor-pointer"
                      aria-label="Toggle complete"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400 hover:text-indigo-500" />
                      )}
                    </button>
                    <span className={`text-xs sm:text-sm font-semibold truncate ${task.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                      {task.title}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 shrink-0 ml-2">
                    High
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Today's Habits Overview */}
      <div className="bento-card !p-2.5 sm:!p-3 shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" /> Today's Habits
          </span>
          <Link to="/habits" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 sm:gap-2 text-xs">
          {activeHabitsList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1a1a1e] p-2 text-center text-xs text-slate-400 dark:text-slate-500 col-span-2 sm:col-span-3 md:col-span-6">
              No active habits for today.
            </div>
          ) : (
            activeHabitsList.slice(0, 6).map((h) => {
              const isDone = (completions || []).some(
                (c) => c.habitId === h.id && c.date === todayStr && c.completed
              );
              return (
                <div
                  key={h.id}
                  onClick={() => dispatch(toggleHabitCompletionFirestore(h.id, todayStr))}
                  className="flex items-center gap-2 cursor-pointer p-1.5 sm:p-2 rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#1a1a1e] hover:bg-slate-100/80 dark:hover:bg-[#222226] transition min-w-0"
                >
                  <span className={`text-xs ${isDone ? "text-emerald-500 font-bold" : "text-slate-400"}`}>
                    {isDone ? "✓" : "○"}
                  </span>
                  <span className={`truncate text-xs font-semibold ${isDone ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}>
                    {h.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}