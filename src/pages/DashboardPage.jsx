import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchTasksFirestore, toggleTaskFirestore, addTaskFirestore } from "../redux/tasksSlice";
import { addItemFirestore, fetchGroceryFirestore } from "../redux/grocerySlice";
import { CheckCircle2, Circle, AlertCircle, ListTodo, ArrowRight, Notebook, ShoppingCart, Settings, Sparkles, Send, Check, X } from "lucide-react";
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
  const upcoming = tasks.filter((t) => !t.completed && t.dueDate && new Date(t.dueDate) >= new Date()).length;
  const todayTasks = tasks
    .filter((t) => !t.completed)
    .filter((t) => {
      if (!t.dueDate) return true;
      const due = new Date(t.dueDate);
      const now = new Date();
      return due.toDateString() === now.toDateString();
    })
    .slice(0, 5);
  
  const highPriorityActive = tasks
    .filter((t) => !t.completed)
    .filter((t) => (t.priority || "").toLowerCase() === "high")
    .sort((a, b) => new Date(a.remindAt || 0) - new Date(b.remindAt || 0));

  const formatWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const buildTodayTaskSummary = () => {
    const todayTasks = tasks.filter((task) => !task.completed && (!task.dueDate || new Date(task.dueDate).toDateString() === new Date().toDateString()));

    if (!todayTasks.length) return "You do not have any tasks scheduled for today.";

    const highPriority = todayTasks.filter((task) => (task.priority || "").toLowerCase() === "high").length;
    return `You have ${todayTasks.length} task${todayTasks.length > 1 ? "s" : ""} today. ${highPriority} high priority. Start with ${todayTasks[0].title}.`;
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

    if (!upcoming.length) return "You have no active tasks right now. This is a good time to plan or add a new task.";

    return `Here is a simple plan for today: 1) ${upcoming[0].title}, 2) ${upcoming[1]?.title || "review your notes"}, 3) ${upcoming[2]?.title || "wrap up loose ends"}.`;
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

  const handleCommandSubmit = async () => {
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
      const response = "I could not detect a clear task or grocery item in that message. Try something like: \"Buy milk and eggs\" or \"Call the doctor tomorrow\".";
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandText("");
      return;
    }

    setCommandItems(parsed.map((item) => ({ ...item, selected: true })));
    setAiResponse("");
    addConversationMessage("assistant", "I organized that into possible tasks and grocery items. Review and save anything you want to add.");
    setCommandError("");
    setCommandSuccess("");
    setCommandText("");
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
    <div className="animate-fade-in-up space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}, {displayName.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your tasks today.</p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#121214]/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 shadow-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {todayLabel}
          </span>
          <NotificationCenter />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-[#121214]/80">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            Mindo command center
          </div>
          <button
            type="button"
            onClick={() => navigate("/command-center")}
            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300"
          >
            Open full chat
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          Keep the dashboard focused while larger prompts and saved items open in a dedicated command space.
        </p>
      </div>

      {commandItems.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-[#121214]/80">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review organized items</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose what to save to Tasks or Grocery.</p>
            </div>
            <button
              type="button"
              onClick={() => setCommandItems([])}
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close review"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {commandItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#1a1a1e]">
                <input
                  type="checkbox"
                  checked={Boolean(item.selected)}
                  onChange={() => setCommandItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, selected: !entry.selected } : entry))}
                  className="h-4 w-4 accent-indigo-600"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      {item.type === "grocery" ? "Grocery" : "Task"}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</span>
                  </div>
                  {(item.quantity || item.bucketLabel || item.dueDate) && (
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.quantity ? item.quantity : null}
                      {item.quantity && item.bucketLabel ? " • " : ""}
                      {item.bucketLabel ? item.bucketLabel : null}
                      {item.dueDate ? ` • ${new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCommandItems((current) => current.map((item) => ({ ...item, selected: false })))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={saveCommandItems}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? "Saving..." : "Add selected"}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="bento-card p-4 bg-indigo-600 dark:bg-indigo-600 border-transparent text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ListTodo className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-indigo-100 text-xs font-medium uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold mt-1">{total}</p>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Done</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{completed}</p>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
              <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Active</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{active}</p>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">High</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{highPriority}</p>
        </div>

        <div className="bento-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{overdue}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-4">
        <div className="bento-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Today’s Tasks
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{todayTasks.length} items</span>
              <Link to="/tasks" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="space-y-2.5">
            {todayTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                All caught up.
              </div>
            ) : (
              todayTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => dispatch(toggleTaskFirestore(task))}
                      aria-label={task.completed ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition hover:scale-105"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 hover:text-indigo-500" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${task.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"}`}>
                        {task.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{task.priority || 'None'} priority</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                    {task.repeat || 'Never'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bento-card p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                Priority
              </h2>
              <Link to="/tasks" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2.5">
              {highPriorityActive.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No urgent tasks.
                </div>
              ) : (
                highPriorityActive.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 dark:bg-[#1a1a1e] border border-slate-100 dark:border-slate-800/60 p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{t.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {t.dueDate ? `Due: ${formatWhen(t.dueDate)}` : "No due date"}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 whitespace-nowrap">
                      High
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bento-card p-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Quick Links</h2>
            <div className="grid grid-cols-2 gap-2.5">
              <Link to="/tasks" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-indigo-700 dark:text-indigo-400">
                <ListTodo className="w-4 h-4" />
                <span className="text-xs font-medium">Tasks</span>
              </Link>
              <Link to="/notes" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <Notebook className="w-4 h-4" />
                <span className="text-xs font-medium">Notes</span>
              </Link>
              <Link to="/grocery" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-xs font-medium">Grocery</span>
              </Link>
              <Link to="/settings" className="flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-slate-100 dark:bg-[#1a1a1e] p-3 text-slate-700 dark:text-slate-400">
                <Settings className="w-4 h-4" />
                <span className="text-xs font-medium">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}