import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchTasksFirestore, toggleTaskFirestore, addTaskFirestore } from "../redux/tasksSlice";
import { addItemFirestore, fetchGroceryFirestore } from "../redux/grocerySlice";
import { CheckCircle2, Circle, AlertCircle, ListTodo, ArrowRight, Notebook, ShoppingCart, Settings, Sparkles, Send, Check, X, Plus } from "lucide-react";
import { isSupabaseConfigured, getCurrentUser } from "../supabase";
import { parseBrainDump, buildDuplicateKey } from "../utils/brainDump";
import NotificationCenter from "../components/NotificationCenter";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const tasks = useSelector((state) => state.tasks || []);
  const grocery = useSelector((state) => state.grocery || []);
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

    return () => {
      active = false;
    };
  }, [dispatch]);

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const todayLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date());

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

  const buildTodayTaskSummary = () => {
    const todays = tasks.filter((task) => !task.completed && (!task.dueDate || new Date(task.dueDate).toDateString() === new Date().toDateString()));
    if (!todays.length) return "You do not have any tasks scheduled for today.";
    const highP = todays.filter((task) => (task.priority || "").toLowerCase() === "high").length;
    return `You have ${todays.length} task${todays.length > 1 ? "s" : ""} today. ${highP} high priority. Start with ${todays[0].title}.`;
  };

  const buildWeeklyGrocerySummary = () => {
    const weekly = grocery.filter((item) => (item.listType || "weekly") === "weekly");
    if (!weekly.length) return "You do not have any weekly groceries yet.";
    return `You have ${weekly.length} grocery item${weekly.length > 1 ? "s" : ""} this week: ${weekly.slice(0, 4).map((item) => `${item.name}${item.quantity ? ` — ${item.quantity}` : ""}`).join(", ")}.`;
  };

  const buildPlanSummary = () => {
    const upcoming = tasks
      .filter((task) => !task.completed)
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
      .slice(0, 3);
    if (!upcoming.length) return "You have no active tasks right now. Good time to plan or add a task.";
    return `Here is a simple plan for today: 1) ${upcoming[0].title}, 2) ${upcoming[1]?.title || "review notes"}, 3) ${upcoming[2]?.title || "wrap up loose ends"}.`;
  };

  const addConversationMessage = (role, text) => {
    setConversation((current) => [
      ...current,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        text,
      },
    ].slice(-8));
  };

  const handleCommandSubmit = async (e) => {
    if (e) e.preventDefault();
    const raw = commandText.trim();
    if (!raw) {
      setCommandError("Write a thought, task, or grocery item first.");
      return;
    }

    setConversation((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: raw }].slice(-8));

    const lower = raw.toLowerCase();
    if (/(what do i need to do today|what do i have today|what do i need to do)/i.test(lower)) {
      const response = buildTodayTaskSummary();
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      return;
    }

    if (/(what groceries|which groceries|what do i need.*week|grocery.*this week)/i.test(lower)) {
      const response = buildWeeklyGrocerySummary();
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      return;
    }

    if (/plan my day/i.test(lower)) {
      const response = buildPlanSummary();
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      return;
    }

    const parsed = parseBrainDump(raw);
    if (!parsed.length) {
      const response = "I could not detect a clear task or grocery item. Try: \"Buy milk\" or \"Call doc tomorrow\".";
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandText("");
      return;
    }

    setCommandItems(parsed.map((item) => ({ ...item, selected: true })));
    setAiResponse("");
    addConversationMessage("assistant", "I organized that into possible tasks and groceries. Review and save below.");
    setCommandError("");
    setCommandSuccess("");
    setCommandText("");
  };

  const handleQuickTaskAdd = async (e) => {
    if (e) e.preventDefault();
    const title = quickTaskText.trim();
    if (!title) return;

    await dispatch(addTaskFirestore({
      title,
      note: "",
      dueDate: null,
      priority: "None",
      category: "Reminders",
      repeat: "Never",
      organization: "",
      placesPeople: "",
      locationType: "none",
      locationReminder: false,
      locationName: "",
      completed: false,
    }));

    setQuickTaskText("");
  };

  const saveCommandItems = async () => {
    const selected = commandItems.filter((item) => item.selected && item.title?.trim());
    if (!selected.length) {
      setCommandError("Select at least one item to save.");
      return;
    }

    setIsProcessing(true);
    setCommandError("");
    setCommandSuccess("");

    try {
      const existingTaskKeys = new Set(tasks.map((task) => buildDuplicateKey(task.title || "", task.dueDate || "")));
      const existingGroceryKeys = new Set(grocery.map((item) => `${(item.name || "").trim().toLowerCase()}::${(item.quantity || "").trim().toLowerCase()}::${(item.bucketLabel || "").trim().toLowerCase()}`));

      let tasksSaved = 0;
      let groceriesSaved = 0;

      for (const item of selected) {
        if (item.type === "grocery") {
          const cleanName = item.title.trim();
          const key = `${cleanName.toLowerCase()}::${(item.quantity || "").toLowerCase()}::${(item.bucketLabel || "").toLowerCase()}`;
          if (existingGroceryKeys.has(key)) continue;

          await dispatch(addItemFirestore({
            name: cleanName,
            quantity: item.quantity || "",
            bucketLabel: item.bucketLabel || (item.listType === "monthly" ? "This Month" : "This Week"),
            listType: item.listType || "weekly",
            completed: false,
          }));

          existingGroceryKeys.add(key);
          groceriesSaved += 1;
          continue;
        }

        const cleanTitle = item.title.trim();
        const taskKey = buildDuplicateKey(cleanTitle, item.dueDate || "");
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

  return (
    <div className="animate-fade-in-up flex flex-col md:h-full md:min-h-0 space-y-3 sm:space-y-4 md:overflow-y-auto pr-0 sm:pr-1 max-w-full overflow-x-hidden">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
        <div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            {getGreeting()}, {displayName.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Here's your productivity overview for today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#121214]/90 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm shrink-0">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {todayLabel}
          </span>
          <NotificationCenter />
        </div>
      </div>

      {/* Bento Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0">
        <div className="bento-card !p-3 sm:!p-4 bg-indigo-600 dark:bg-indigo-600 border-transparent text-white flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-indigo-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total</span>
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
              <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black">{total}</span>
        </div>

        <div className="bento-card !p-3 sm:!p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Done</span>
            <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{completed}</span>
        </div>

        <div className="bento-card !p-3 sm:!p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active</span>
            <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{active}</span>
        </div>

        <div className="bento-card !p-3 sm:!p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">High</span>
            <div className="p-1.5 sm:p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{highPriority}</span>
        </div>

        <div className="bento-card !p-3 sm:!p-4 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Overdue</span>
            <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <span className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">{overdue}</span>
        </div>
      </div>

      {/* Main Tasks & Priority Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3 sm:gap-4 shrink-0">
        {/* Today's Tasks Column */}
        <div className="bento-card !p-3 sm:!p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
              Today’s Tasks
              <span className="text-xs font-semibold text-slate-400 ml-1">({todayTasks.length})</span>
            </h2>
            <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {todayTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-3 sm:p-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                All caught up for today!
              </div>
            ) : (
              todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#1a1a1e] p-2.5 sm:p-3 transition-all hover:bg-slate-100/80 dark:hover:bg-[#222226]">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => dispatch(toggleTaskFirestore(task))}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                      aria-label="Toggle complete"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 hover:text-indigo-500" />
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

        {/* Priority & Quick Links Column */}
        <div className="flex flex-col space-y-3">
          {/* Priority Tasks Card */}
          <div className="bento-card !p-3 sm:!p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
                Priority Items
              </h2>
              <Link to="/tasks" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {highPriorityActive.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-3 sm:p-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  No high priority tasks.
                </div>
              ) : (
                highPriorityActive.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200/60 dark:border-slate-800/60 p-2.5">
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">{t.title}</span>
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 shrink-0">
                      High
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Navigation Bar */}
          <div className="bento-card !p-2.5 sm:!p-3 shrink-0">
            <div className="grid grid-cols-4 gap-2">
              <Link to="/tasks" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-2 sm:p-2.5 text-indigo-700 dark:text-indigo-400 hover:opacity-90 transition">
                <ListTodo className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-bold">Tasks</span>
              </Link>
              <Link to="/notes" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-amber-50 dark:bg-amber-500/10 p-2 sm:p-2.5 text-amber-700 dark:text-amber-400 hover:opacity-90 transition">
                <Notebook className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-bold">Notes</span>
              </Link>
              <Link to="/grocery" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-2 sm:p-2.5 text-emerald-700 dark:text-emerald-400 hover:opacity-90 transition">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-bold">Grocery</span>
              </Link>
              <Link to="/settings" className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-[#1a1a1e] p-2 sm:p-2.5 text-slate-700 dark:text-slate-400 hover:opacity-90 transition">
                <Settings className="w-4 h-4" />
                <span className="text-[10px] sm:text-xs font-bold">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Downside Input Bar: Command Center + Quick Task Add */}
      <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-md dark:border-slate-800/80 dark:bg-[#121214]/90 backdrop-blur-md max-w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {/* Command Center Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-4 h-4" /> Command Center
              </span>
              <button
                type="button"
                onClick={() => navigate("/command-center")}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Full chat &rarr;
              </button>
            </div>
            <form onSubmit={handleCommandSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-[#1a1a1e] border border-transparent dark:border-slate-800/80 px-3.5 py-2 sm:py-2.5">
                <input
                  type="text"
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>

          {/* Quick Task Add Input */}
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Plus className="w-4 h-4" /> Quick Task
            </span>
            <form onSubmit={handleQuickTaskAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-[#1a1a1e] border border-transparent dark:border-slate-800/80 px-3.5 py-2 sm:py-2.5">
                <input
                  type="text"
                  value={quickTaskText}
                  onChange={(e) => setQuickTaskText(e.target.value)}
                  placeholder="+ What needs to be done?"
                  className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!quickTaskText.trim()}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>

        {/* AI response or Command Error message inline if present */}
        {(aiResponse || commandError || commandSuccess) && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs sm:text-sm flex items-center justify-between">
            <span className={commandError ? "text-rose-500 font-semibold" : commandSuccess ? "text-emerald-500 font-semibold" : "text-slate-700 dark:text-slate-200 font-semibold"}>
              {commandError || commandSuccess || aiResponse}
            </span>
            <button
              onClick={() => { setAiResponse(""); setCommandError(""); setCommandSuccess(""); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Command Review Banner if Items Parsed */}
      {commandItems.length > 0 && (
        <div className="shrink-0 rounded-2xl sm:rounded-3xl border border-indigo-200 bg-indigo-50/90 p-3 sm:p-4 dark:border-indigo-900/50 dark:bg-indigo-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200">
              Review organized items ({commandItems.filter(i => i.selected).length} selected)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveCommandItems}
                disabled={isProcessing}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                {isProcessing ? "Saving..." : "Save selected"}
              </button>
              <button
                type="button"
                onClick={() => setCommandItems([])}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {commandItems.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded-xl border border-indigo-200/60 bg-white dark:bg-[#121214] px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(item.selected)}
                  onChange={() => setCommandItems((curr) => curr.map((e) => e.id === item.id ? { ...e, selected: !e.selected } : e))}
                  className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
                />
                <span className="capitalize text-xs text-indigo-600 dark:text-indigo-400 font-extrabold">[{item.type}]</span>
                <span className="truncate max-w-[140px] sm:max-w-[180px]">{item.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}