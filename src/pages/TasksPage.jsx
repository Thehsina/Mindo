import { useSelector, useDispatch } from "react-redux";
import { useState, useEffect } from "react";
import TaskList from "../components/TaskList";
import TaskBoard from "../components/TaskBoard";
import FilterTask from "../components/FilterTask";
import { fetchTasksFirestore } from "../redux/tasksSlice";
import { CheckSquare, LayoutList, Kanban, Search, ArrowUpDown } from "lucide-react";

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
  const [priorityFilter, setPriorityFilter] = useState("all");
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

      // Priority filter (All, High, Medium, Low)
      if (priorityFilter !== "all") {
        if ((task.priority || "").toLowerCase() !== priorityFilter.toLowerCase()) {
          return false;
        }
      }

      // Status & Timeline filter
      if (filter === "active") return !task.completed;
      if (filter === "completed") return task.completed;
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
    <div className="animate-fade-in-up flex flex-col lg:h-full lg:min-h-0 space-y-2.5 sm:space-y-3 overflow-x-hidden max-w-full">
      {/* 1. COMPACT UNIFIED TOP HEADER */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Tasks
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate">
              Everything on your mind, organized.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Search and Filter Row */}
      <div className="shrink-0 flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center justify-between gap-2 max-w-full">
        {/* Search input */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] px-3.5 py-2 w-full sm:max-w-xs md:max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Priority Buttons + Filter Dropdown + (Due Date + View Toggle locked on same line) */}
        <div className="flex flex-nowrap items-center justify-between sm:justify-end gap-1 sm:gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {/* Priority Toggle Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-[#1a1a1e] p-0.5 border border-slate-200/80 dark:border-slate-800/80 shrink-0">
            {[
              { id: "all", label: "All", active: "bg-white dark:bg-[#2a2a2e] text-slate-900 dark:text-white" },
              { id: "high", label: "High", dot: "bg-rose-500", active: "bg-rose-100 dark:bg-rose-500/25 text-rose-700 dark:text-rose-300" },
              { id: "medium", label: "Med", dot: "bg-amber-500", active: "bg-amber-100 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300" },
              { id: "low", label: "Low", dot: "bg-emerald-500", active: "bg-emerald-100 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300" },
            ].map((btn) => {
              const isSel = priorityFilter === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setPriorityFilter(btn.id)}
                  className={`flex items-center gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-bold cursor-pointer select-none outline-none focus:outline-none min-h-[28px] sm:min-h-0 ${
                    isSel
                      ? btn.active
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title={`${btn.label} Priority`}
                >
                  {btn.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${btn.dot}`} />}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>

          {/* Filter Dropdown with inside scroll */}
          <FilterTask
            filter={filter}
            setFilter={setFilter}
          />

          {/* Due Date Sort & View Mode Toggle (Locked on Same Line) */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Sort Selector (Due date) displaying full name */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] px-1.5 sm:px-2 py-0.5 sm:py-1.5 min-h-[28px] sm:min-h-0 shrink-0">
              <ArrowUpDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer w-auto pr-0.5"
                title="Sort tasks"
              >
                <option value="dueDate">Due date</option>
                <option value="priority">Priority</option>
                <option value="createdAt">Created date</option>
                <option value="title">Title</option>
              </select>
            </div>

            {/* View Mode Toggle placed directly after Due Date */}
            <div className="flex items-center bg-slate-100 dark:bg-[#1a1a1e] p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1 sm:p-1.5 rounded-lg cursor-pointer min-h-[26px] min-w-[26px] sm:min-h-0 sm:min-w-0 flex items-center justify-center outline-none select-none ${
                  viewMode === "list"
                    ? "bg-white dark:bg-[#2a2a2e] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                title="List View"
              >
                <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`p-1 sm:p-1.5 rounded-lg cursor-pointer min-h-[26px] min-w-[26px] sm:min-h-0 sm:min-w-0 flex items-center justify-center outline-none select-none ${
                  viewMode === "board"
                    ? "bg-white dark:bg-[#2a2a2e] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
                title="Board View"
              >
                <Kanban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Task List / Board Content Area */}
      <div className="lg:flex-1 lg:min-h-0 flex flex-col lg:overflow-hidden max-w-full">
        {viewMode === "list" ? (
          <div className="bento-card lg:flex-1 lg:min-h-0 flex flex-col !p-3 sm:!p-4 lg:overflow-hidden max-w-full">
            <TaskList tasks={filteredTasks} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden max-w-full pb-2">
            <TaskBoard tasks={filteredTasks} />
          </div>
        )}
      </div>
    </div>
  );
}