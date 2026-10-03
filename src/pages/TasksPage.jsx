import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import TaskList from "../components/TaskList";
import TaskBoard from "../components/TaskBoard";
import FilterTask from "../components/FilterTask";
import { fetchTasksFirestore } from "../redux/tasksSlice";
import { LayoutList, Kanban, Search, ArrowUpDown } from "lucide-react";

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

  return (
    <div className="animate-fade-in-up flex flex-col h-full min-h-0 space-y-3 sm:space-y-3.5 overflow-x-hidden max-w-full">
      {/* 1. Header */}
      <div className="shrink-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Tasks</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Everything on your mind, organized.</p>
      </div>

      {/* 2. Search and Filter Row */}
      <div className="shrink-0 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center justify-between gap-2 max-w-full">
        {/* Full width Search input on mobile */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] px-3.5 py-2 w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 max-w-full overflow-x-auto no-scrollbar">
          <FilterTask filter={filter} setFilter={setFilter} />

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] px-2 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="dueDate">Due date</option>
                <option value="priority">Priority</option>
                <option value="createdAt">Created date</option>
                <option value="title">Title</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-[#1a1a1e] p-0.5 rounded-xl">
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${viewMode === "list" ? "bg-white dark:bg-[#2a2a2e] shadow-xs text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                title="List View"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("board")}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center ${viewMode === "board" ? "bg-white dark:bg-[#2a2a2e] shadow-xs text-indigo-600 dark:text-indigo-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                title="Board View"
              >
                <Kanban className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Task List Content Area */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden max-w-full">
        {viewMode === "list" ? (
          <div className="bento-card flex-1 min-h-0 flex flex-col !p-3 sm:!p-4 overflow-hidden max-w-full">
            <TaskList tasks={filteredTasks} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-x-auto pb-2 no-scrollbar max-w-full">
            <TaskBoard tasks={filteredTasks} />
          </div>
        )}
      </div>
    </div>
  );
}