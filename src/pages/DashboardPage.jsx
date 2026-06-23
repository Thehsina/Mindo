import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { fetchTasksFirestore } from "../redux/tasksSlice";

export default function DashboardPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.tasks);

  useEffect(() => {
    // Ensure tasks are loaded whenever the dashboard is opened
    dispatch(fetchTasksFirestore());
  }, [dispatch]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const active = tasks.filter((t) => !t.completed).length;

  const highPriority = tasks.filter((t) => (t.priority || "").toLowerCase() === "high").length;
  const highPriorityActive = tasks
    .filter((t) => !t.completed)
    .filter((t) => (t.priority || "").toLowerCase() === "high")
    .sort((a, b) => new Date(a.remindAt || 0) - new Date(b.remindAt || 0));

  const formatWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col pt-20">
      <Navbar title="Dashboard" />
      <div className="flex-1 p-8 flex justify-center">
        <div className="w-full max-w-4xl">

          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-8 text-center">
            Dashboard
          </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">

          <div className="glass p-6 text-center hover:glass-card transition">
            <p className="text-cyan-300/80 text-sm mb-2">Total Tasks</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{total}</p>
          </div>

          <div className="glass p-6 text-center hover:glass-card transition">
            <p className="text-cyan-300/80 text-sm mb-2">Completed</p>
            <p className="text-3xl font-bold text-emerald-400">{completed}</p>
          </div>

          <div className="glass p-6 text-center hover:glass-card transition">
            <p className="text-cyan-300/80 text-sm mb-2">Active</p>
            <p className="text-3xl font-bold text-blue-400">{active}</p>
          </div>

          <div className="glass p-6 text-center hover:glass-card transition">
            <p className="text-cyan-300/80 text-sm mb-2">High Priority</p>
            <p className="text-3xl font-bold text-pink-400">{highPriority}</p>
          </div>

        </div>

        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-cyan-300">High Priority Reminders</h2>
            <Link
              to="/tasks"
              className="text-sm text-orange-600 hover:text-orange-700 underline underline-offset-2"
            >
              Manage tasks
            </Link>
          </div>

          {highPriorityActive.length === 0 ? (
            <p className="text-white/60 text-sm">No unfinished high priority tasks.</p>
          ) : (
            <div className="space-y-3">
              {highPriorityActive.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-3 glass p-3 hover:glass-card transition"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">{t.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                      Remind at: <span className="font-medium">{formatWhen(t.remindAt)}</span>
                      {" · "}
                      Due: <span className="font-medium">{formatWhen(t.dueDate)}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-medium shrink-0">
                    High
                  </span>
                </div>
              ))}
              {highPriorityActive.length > 5 && (
                <div className="text-sm text-gray-500 dark:text-gray-300">
                  +{highPriorityActive.length - 5} more
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4">

          <Link
            to="/tasks"
            className="bg-orange-500 text-white px-6 py-3 rounded-lg shadow hover:bg-orange-600 cursor-pointer"
          >
            Manage Tasks
          </Link>

          <Link
            to="/notes"
            className="bg-amber-500 text-white px-6 py-3 rounded-lg shadow hover:bg-amber-600 cursor-pointer"
          >
            Notes
          </Link>

          <Link
            to="/grocery"
            className="bg-green-500 text-white px-6 py-3 rounded-lg shadow hover:bg-green-600 cursor-pointer"
          >
            Grocery List
          </Link>

          <Link
            to="/settings"
            className="bg-gray-500 text-white px-6 py-3 rounded-lg shadow hover:bg-gray-600 cursor-pointer"
          >
            Settings
          </Link>

        </div>

        </div>
      </div>
    </div>
  );
}