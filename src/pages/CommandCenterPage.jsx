import React from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  Activity,
  Utensils,
  FileText,
  Bell,
} from "lucide-react";
import UniversalCommandCenter from "../components/UniversalCommandCenter";

export default function CommandCenterPage() {
  const tasks = useSelector((state) => state.tasks || []);
  const expenses = useSelector((state) => state.expenses || []);
  const grocery = useSelector((state) => state.grocery || []);
  const meals = useSelector((state) => state.meals || []);
  const { habits = [] } = useSelector((state) => state.habits || {});
  const notes = useSelector((state) => state.notes || []);

  const activeTasks = tasks.filter((t) => !t.completed);
  const activeGrocery = grocery.filter((g) => !g.completed);

  // Month expense total
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthExpenses = expenses
    .filter((e) => e.type !== "income" && e.date?.startsWith(currentMonthStr))
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-6 dark:bg-[#0b0b0d] md:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Navigation Top Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-800/80 dark:bg-[#121214]/90 dark:text-slate-200 dark:hover:bg-[#19191d]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Command Center</span>
          </div>
        </div>

        {/* Header Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Tell Mindo what you need.
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            Type or speak naturally. Mindo automatically parses your intent and saves to the correct module.
          </p>
        </div>

        {/* 2-Column Responsive Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Command Input & Chat History Column (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <UniversalCommandCenter />
          </div>

          {/* Connected Modules Intelligence Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Live Module Overview Cards */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#121214]/90 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Connected Modules
                </h3>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">8 Modules Active</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/tasks"
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 transition hover:border-indigo-300 hover:bg-white dark:border-slate-800/80 dark:bg-[#17171a]/70 dark:hover:bg-[#1c1c20]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Tasks</span>
                    <CheckSquare className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">{activeTasks.length}</div>
                  <p className="text-[10px] text-slate-400">Active to-dos</p>
                </Link>

                <Link
                  to="/expenses"
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 transition hover:border-indigo-300 hover:bg-white dark:border-slate-800/80 dark:bg-[#17171a]/70 dark:hover:bg-[#1c1c20]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Expenses</span>
                    <DollarSign className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">AED {monthExpenses}</div>
                  <p className="text-[10px] text-slate-400">This month</p>
                </Link>

                <Link
                  to="/grocery"
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 transition hover:border-indigo-300 hover:bg-white dark:border-slate-800/80 dark:bg-[#17171a]/70 dark:hover:bg-[#1c1c20]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Grocery</span>
                    <ShoppingCart className="h-3.5 w-3.5 text-teal-500" />
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">{activeGrocery.length}</div>
                  <p className="text-[10px] text-slate-400">Items to buy</p>
                </Link>

                <Link
                  to="/habits"
                  className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 transition hover:border-indigo-300 hover:bg-white dark:border-slate-800/80 dark:bg-[#17171a]/70 dark:hover:bg-[#1c1c20]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Habits</span>
                    <Activity className="h-3.5 w-3.5 text-purple-500" />
                  </div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">{habits.length}</div>
                  <p className="text-[10px] text-slate-400">Active habits</p>
                </Link>
              </div>

              {/* Secondary Module Links */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/meal-planner"
                  className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2 font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-[#17171a]/70 dark:text-slate-300 dark:hover:bg-indigo-950/30"
                >
                  <Utensils className="h-3.5 w-3.5 text-amber-500" />
                  <span>Meal Planner ({meals.length})</span>
                </Link>

                <Link
                  to="/notes"
                  className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2 font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-[#17171a]/70 dark:text-slate-300 dark:hover:bg-indigo-950/30"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Notes ({notes.length})</span>
                </Link>

                <Link
                  to="/tasks"
                  className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2 font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-[#17171a]/70 dark:text-slate-300 dark:hover:bg-indigo-950/30"
                >
                  <Bell className="h-3.5 w-3.5 text-sky-500" />
                  <span>Reminders</span>
                </Link>

                <Link
                  to="/expenses"
                  className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2 font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 dark:bg-[#17171a]/70 dark:text-slate-300 dark:hover:bg-indigo-950/30"
                >
                  <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Income & Money</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
