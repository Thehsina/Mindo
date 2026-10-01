import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import TaskList from "../components/TaskList";
import TaskBoard from "../components/TaskBoard";
import FilterTask from "../components/FilterTask";
import { addTaskFirestore, fetchTasksFirestore } from "../redux/tasksSlice";
import { LayoutList, Kanban, Search, Plus, ArrowUpDown } from "lucide-react";

const getTaskDateValue = (task) => {
  if (!task.dueDate) return Number.MAX_SAFE_INTEGER;
  const d = new Date(task.dueDate);
  return Number.isNaN(d.getTime()) ? Number.MAX_SAFE_INTEGER : d.getTime();
};

const getPriorityScore = (priority) => {
  const p = (priority || "").toLowerCase();
  if (p === "high") return 3;
  if (p === "medium") return 2;
  if (p === "low") return 1;
  return 0;
};

export default function TasksPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.tasks);
  const [filter, setFilter] = useState("all");
  const [viewMode, setViewMode] = useState("list");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("dueDate");
  const [quickAdd, setQuickAdd] = useState("");

  useEffect(() => {
    dispatch(fetchTasksFirestore());
  }, [dispatch]);

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;

  const filteredTasks = [...tasks]
    .filter((task) => {
      const matchesSearch =
        !search ||
        `${task.title || ""} ${task.note || ""}`.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === "active") return !task.completed;
      if (filter === "completed") return task.completed;
      if (filter === "high") return (task.priority || "").toLowerCase() === "high";
      if (filter === "medium") return (task.priority || "").toLowerCase() === "medium";
      if (filter === "low") return (task.priority || "").toLowerCase() === "low";
      if (filter === "today") {
        if (!task.dueDate) return false;
        const taskTime = new Date(task.dueDate).getTime();
        return taskTime >= startOfToday && taskTime < endOfToday && !task.completed;
      }
      if (filter === "upcoming") {
        if (!task.dueDate || task.completed) return false;
        const taskTime = new Date(task.dueDate).getTime();
        return taskTime > endOfToday;
      }
      if (filter === "overdue") {
        if (!task.dueDate || task.completed) return false;
        return new Date(task.dueDate).getTime() < startOfToday;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "priority") {
        return getPriorityScore(b.priority) - getPriorityScore(a.priority);
      }
      if (sortBy === "createdAt") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }

      const aDue = getTaskDateValue(a);
      const bDue = getTaskDateValue(b);
      return aDue - bDue;
    });

  const handleQuickAdd = async (event) => {
    event.preventDefault();
    const title = quickAdd.trim();
    if (!title) return;

    await dispatch(
      addTaskFirestore({
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
      })
    );

    setQuickAdd("");
  };

  return (
    <div className="animate-fade-in-up flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Tasks</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Everything on your mind, organized.</p>
        </div>

        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-white/70 dark:bg-[#121214]/80 p-3 shadow-sm">
          <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60">
            <Plus className="w-4 h-4 text-indigo-500" />
            <input
              value={quickAdd}
              onChange={(event) => setQuickAdd(event.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Add task
          </button>
        </form>
      </div>

      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] px-3 py-2 max-w-xl">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterTask filter={filter} setFilter={setFilter} />

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] px-2.5 py-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="bg-transparent text-sm text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="createdAt">Created date</option>
              <option value="title">Title</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-[#1a1a1e] p-1 rounded-xl">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white dark:bg-[#2a2a2e] shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <LayoutList className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("board")}
              className={`p-2 rounded-lg transition-colors ${viewMode === "board" ? "bg-white dark:bg-[#2a2a2e] shadow-sm text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              <Kanban className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === "list" ? (
          <div className="bento-card flex-1 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Task List <span className="text-slate-400 font-medium ml-2 text-sm">{filteredTasks.length}</span>
              </h2>
            </div>
            <TaskList tasks={filteredTasks} />
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto pb-4">
            <TaskBoard tasks={filteredTasks} />
          </div>
        )}
      </div>
    </div>
  );
}