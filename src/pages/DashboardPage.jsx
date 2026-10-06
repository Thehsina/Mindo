import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchTasksFirestore, toggleTaskFirestore, addTaskFirestore } from "../redux/tasksSlice";
import { addItemFirestore, fetchGroceryFirestore } from "../redux/grocerySlice";
import { fetchHabitsFirestore, toggleHabitCompletionFirestore } from "../redux/habitsSlice";
import { fetchMealsFirestore } from "../redux/mealsSlice";
import { CheckCircle2, Circle, AlertCircle, ListTodo, ArrowRight, Notebook, ShoppingCart, Settings, Sparkles, Send, Check, X, Plus, Flame, Utensils } from "lucide-react";
import { isSupabaseConfigured, getCurrentUser } from "../supabase";
import { parseBrainDump, buildDuplicateKey } from "../utils/brainDump";
import NotificationCenter from "../components/NotificationCenter";
import UniversalCommandCenter from "../components/UniversalCommandCenter";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tasks = useSelector((state) => state.tasks || []);
  const grocery = useSelector((state) => state.grocery || []);
  const { habits = [], completions = [] } = useSelector((state) => state.habits || {});
  const meals = useSelector((state) => state.meals || []);

  const [user, setUser] = useState(null);
  const [commandText, setCommandText] = useState("");
  const [quickTaskText, setQuickTaskText] = useState("");
  const [commandItems, setCommandItems] = useState([]);
  const [commandError, setCommandError] = useState("");
  const [commandSuccess, setCommandSuccess] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const todayStr = new Date().toISOString().split('T')[0];
  const daysList = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const todayDayName = daysList[new Date().getDay()];

  const activeHabitsList = (habits || []).filter((h) => h.archived !== true);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active = tasks.filter((t) => !t.completed).length;
  const highPriority = tasks.filter((t) => (t.priority || "").toLowerCase() === "high").length;
  const overdue = tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length;

  const todayTasks = tasks
    .filter((t) => !t.completed)
    .filter((t) => {
      if (!t.dueDate) return true;
      const due = new Date(t.dueDate);
      const now = new Date();
      return due.toDateString() === now.toDateString();
    });

  const highPriorityActive = tasks
    .filter((t) => !t.completed)
    .filter((t) => (t.priority || "").toLowerCase() === "high")
    .sort((a, b) => new Date(a.remindAt || 0) - new Date(b.remindAt || 0));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const addConversationMessage = (role, text) => {
    setConversation((prev) => [...prev, { role, text, timestamp: new Date() }]);
  };

  const handleCommandSubmit = async (e) => {
    e.preventDefault();
    const input = commandText.trim();
    if (!input || isProcessing) return;

    setIsProcessing(true);
    setCommandError("");
    setCommandSuccess("");
    addConversationMessage("user", input);

    try {
      const parsed = parseBrainDump(input);
      setCommandItems(parsed);

      if (!parsed.length) {
        const msg = "I couldn't detect actionable items. Try writing e.g., 'Buy milk on Tuesday #Groceries'.";
        setAiResponse(msg);
        addConversationMessage("assistant", msg);
        setIsProcessing(false);
        return;
      }

      const existingTaskKeys = new Set(tasks.map((t) => buildDuplicateKey(t.title, t.dueDate)));
      let tasksSaved = 0;
      let groceriesSaved = 0;

      for (const item of parsed) {
        const cleanTitle = (item.title || "").trim();
        if (!cleanTitle) continue;

        if (item.type === "grocery") {
          await dispatch(addItemFirestore({
            name: cleanTitle,
            category: item.category || "Other",
            quantity: item.quantity || "1",
            bucketLabel: item.bucketLabel || "",
            listType: item.listType || "weekly",
            completed: false,
          }));
          groceriesSaved += 1;
          continue;
        }

        const taskKey = buildDuplicateKey(cleanTitle, item.dueDate);
        if (existingTaskKeys.has(taskKey)) continue;

        await dispatch(addTaskFirestore({
          title: cleanTitle,
          note: "",
          dueDate: item.dueDate || null,
          priority: item.priority || "None",
          category: item.category || "Reminders",
          repeat: "Never",
          organization: "",
          placesPeople: "",
          locationType: "none",
          locationReminder: false,
          locationName: "",
          completed: false,
        }));

        existingTaskKeys.add(taskKey);
        tasksSaved += 1;
      }

      const summary = [];
      if (tasksSaved) summary.push(`${tasksSaved} task${tasksSaved > 1 ? "s" : ""}`);
      if (groceriesSaved) summary.push(`${groceriesSaved} grocery item${groceriesSaved > 1 ? "s" : ""}`);

      const finalMessage = summary.length ? `Saved ${summary.join(" and ")}.` : "Nothing new was added.";
      setCommandSuccess(finalMessage);
      addConversationMessage("assistant", finalMessage);
      setCommandText("");
      setCommandItems([]);
      setAiResponse("");
    } catch (error) {
      console.error("Command save failed:", error);
      setCommandError("I couldn't save that right now. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickTaskSubmit = async (e) => {
    e.preventDefault();
    const text = quickTaskText.trim();
    if (!text) return;

    await dispatch(
      addTaskFirestore({
        title: text,
        note: "",
        dueDate: todayStr,
        priority: "None",
        category: "Reminders",
        repeat: "Never",
        completed: false,
      })
    );

    setQuickTaskText("");
  };

  return (
    <div className="animate-fade-in-up flex flex-col md:h-full md:min-h-0 md:justify-between space-y-2.5 sm:space-y-3.5 md:overflow-hidden pr-0 sm:pr-1 max-w-full overflow-x-hidden">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {getGreeting()}, {displayName.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Here's your productivity overview for today.</p>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#121214]/90 px-3.5 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm shrink-0">
          <span className="hidden sm:inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {todayLabel}
          </span>
          <button
            type="button"
            onClick={() => navigate("/command-center")}
            title="Command Center"
            aria-label="Open Command Center"
            className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/80 dark:border-indigo-900/40 dark:bg-indigo-950/40 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Command Center</span>
          </button>
          <NotificationCenter />
        </div>
      </div>

      {/* Bento Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0">
        <div className="bento-card !p-2.5 sm:!p-3.5 bg-indigo-600 dark:bg-indigo-600 border-transparent text-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-indigo-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total</span>
            <div className="p-1.5 bg-white/20 rounded-xl">
              <ListTodo className="w-4 h-4 text-white" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black">{total}</span>
        </div>

        <div className="bento-card !p-2.5 sm:!p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Done</span>
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{completed}</span>
        </div>

        <div className="bento-card !p-2.5 sm:!p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active</span>
            <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{active}</span>
        </div>

        <div className="bento-card !p-2.5 sm:!p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">High</span>
            <div className="p-1.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{highPriority}</span>
        </div>

        <div className="bento-card !p-2.5 sm:!p-3.5 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Overdue</span>
            <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{overdue}</span>
        </div>
      </div>

      {/* Main Tasks Grid: Today's Tasks & Priority Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
        {/* Today's Tasks Column */}
        <div className="bento-card !p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              Today’s Tasks
              <span className="text-xs font-semibold text-slate-400 ml-1">({todayTasks.length})</span>
            </h2>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {todayTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-3 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                All caught up for today!
              </div>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#1a1a1e] p-2 transition-all hover:bg-slate-100/80 dark:hover:bg-[#222226]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => dispatch(toggleTaskFirestore(task))}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition cursor-pointer"
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
        <div className="bento-card !p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
              Priority Tasks
              <span className="text-xs font-semibold text-slate-400 ml-1">({highPriorityActive.length})</span>
            </h2>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {highPriorityActive.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-3 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No high priority tasks!
              </div>
            ) : (
              highPriorityActive.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#1a1a1e] p-2 transition-all hover:bg-slate-100/80 dark:hover:bg-[#222226]">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => dispatch(toggleTaskFirestore(task))}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition cursor-pointer"
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

      {/* Secondary Row: Today's Habits Overview & Quick Navigation Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 shrink-0">
        {/* Today's Habits Overview */}
        <div className="bento-card !p-2.5 sm:!p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" /> TODAY'S HABITS
            </span>
            <Link to="/habits" className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">
              View &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {activeHabitsList.length === 0 ? (
              <span className="text-[10px] text-slate-400 block italic col-span-2">No active habits</span>
            ) : (
              activeHabitsList.slice(0, 4).map((h) => {
                const isDone = (completions || []).some(
                  (c) => c.habitId === h.id && c.date === todayStr && c.completed
                );
                return (
                  <div
                    key={h.id}
                    onClick={() => dispatch(toggleHabitCompletionFirestore(h.id, todayStr))}
                    className="flex items-center gap-1.5 cursor-pointer text-[11px] truncate hover:text-indigo-600 transition"
                  >
                    <span className={isDone ? "text-emerald-500 font-bold" : "text-slate-400"}>
                      {isDone ? "✓" : "○"}
                    </span>
                    <span className={`truncate ${isDone ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"}`}>
                      {h.name}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Navigation Bar */}
        <div className="bento-card !p-2 sm:!p-2.5 flex flex-col justify-center shrink-0">
          <div className="grid grid-cols-5 gap-1.5">
            <Link to="/tasks" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-2 text-indigo-700 dark:text-indigo-400 hover:opacity-90 transition">
              <ListTodo className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold">Tasks</span>
            </Link>
            <Link to="/habits" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2 text-amber-700 dark:text-amber-400 hover:opacity-90 transition">
              <Flame className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold">Habits</span>
            </Link>
            <Link to="/meal-planner" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-purple-50 dark:bg-purple-500/10 p-2 text-purple-700 dark:text-purple-400 hover:opacity-90 transition">
              <Utensils className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold font-sans">Meals</span>
            </Link>
            <Link to="/grocery" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2 text-emerald-700 dark:text-emerald-400 hover:opacity-90 transition">
              <ShoppingCart className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold">Grocery</span>
            </Link>
            <Link to="/notes" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-[#1a1a1e] p-2 text-slate-700 dark:text-slate-400 hover:opacity-90 transition">
              <Notebook className="w-4 h-4" />
              <span className="text-[9px] sm:text-[10px] font-bold">Notes</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Downside Input Bar: Universal Command Center */}
      <div className="shrink-0 max-w-full">
        <UniversalCommandCenter compact={true} />
      </div>
    </div>
  );
}