import { useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Sparkles,
  Trophy,
  ShoppingBag,
  CheckCircle,
  X,
  ArrowRight,
  TrendingUp,
  Zap,
  Award,
  Calendar,
} from "lucide-react";
import {
  selectSundayResetSummary,
  selectWeeklyTasks,
  selectHighestStreak,
  selectTopHabitDetails,
  selectWeeklyGrocerySpend,
  selectWeeklyGroceryCurrency,
} from "../redux/weeklyResetSelectors.js";

/**
 * Calculates a gamified weekly persona archetype based on user activity.
 */
function getWeeklyArchetype(tasksCount, streak, grocerySpend) {
  if (tasksCount >= 10 && streak >= 5) {
    return {
      title: "The Unstoppable Titan",
      tagline: "High velocity execution paired with ironclad discipline.",
      badge: "ELITE PERFORMANCE",
      color: "from-amber-400 via-orange-500 to-rose-500",
      accent: "text-amber-400",
      border: "border-amber-500/30",
    };
  }
  if (tasksCount >= 8) {
    return {
      title: "The Closer",
      tagline: "Ruthless focus. When tasks hit your board, they get finished.",
      badge: "TASK DESTROYER",
      color: "from-indigo-400 via-purple-500 to-pink-500",
      accent: "text-indigo-400",
      border: "border-indigo-500/30",
    };
  }
  if (streak >= 4) {
    return {
      title: "The Ritual Master",
      tagline: "Your habits are compounding. Daily momentum is second nature.",
      badge: "HABIT WARRIOR",
      color: "from-orange-400 via-rose-500 to-red-500",
      accent: "text-orange-400",
      border: "border-orange-500/30",
    };
  }
  if (grocerySpend > 0) {
    return {
      title: "The Nourished Architect",
      tagline: "Intentional nutrition and disciplined weekly provisioning.",
      badge: "LIFESTYLE BALANCED",
      color: "from-emerald-400 via-teal-500 to-cyan-500",
      accent: "text-emerald-400",
      border: "border-emerald-500/30",
    };
  }
  return {
    title: "The Fresh Starter",
    tagline: "Every Sunday offers a clean slate. Build your momentum today.",
    badge: "WEEKLY RESET",
    color: "from-blue-400 via-indigo-500 to-purple-500",
    accent: "text-blue-400",
    border: "border-blue-500/30",
  };
}

export default function WeeklyResetDashboard({
  onClose,
  isOpen = true,
  inline = false,
}) {
  const summary = useSelector(selectSundayResetSummary);
  const tasksCount = useSelector(selectWeeklyTasks);
  const highestStreak = useSelector(selectHighestStreak);
  const topHabit = useSelector(selectTopHabitDetails);
  const grocerySpend = useSelector(selectWeeklyGrocerySpend);
  const currency = useSelector(selectWeeklyGroceryCurrency);

  // Formatted date range for the past 7 days
  const dateRangeLabel = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 6);

    const startStr = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const endStr = today.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }, []);

  const archetype = useMemo(
    () => getWeeklyArchetype(tasksCount, highestStreak, grocerySpend),
    [tasksCount, highestStreak, grocerySpend]
  );

  if (!isOpen) return null;

  const content = (
    <div
      className="relative w-full max-w-lg bg-[#0a0a0b] border border-slate-800/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-white animate-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Ambient Radial Glow Gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-64 w-64 rounded-full bg-indigo-600/15 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-rose-600/10 blur-[90px]" />

      {/* COMPACT HEADER WITH ABSOLUTE TOP-RIGHT CLOSE BUTTON */}
      <div className="relative z-10 px-5 pt-5 pb-3 border-b border-white/[0.06] shrink-0 pr-12">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            <Sparkles className="h-2.5 w-2.5" />
            Sunday Reset
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-400">
            <Calendar className="h-2.5 w-2.5 text-slate-500" />
            {dateRangeLabel}
          </span>
        </div>

        <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white leading-tight">
          Your Week{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-amber-300 bg-clip-text text-transparent">
            Wrapped
          </span>
        </h2>
        <p className="text-[11px] text-slate-400 leading-snug">
          Your last 7 days at a glance. Celebrate the wins and momentum.
        </p>

        {/* Absolute Top-Right Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review"
            className="absolute top-4 right-4 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1.5 text-slate-400 hover:bg-white/[0.08] hover:text-white transition duration-150 cursor-pointer active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* INTERNAL SCROLLABLE CONTAINER */}
      <div className="overflow-y-auto p-5 space-y-3 flex-1 no-scrollbar">
        {/* COMPACT BENTO GRID (3 CORE METRICS) */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* CARD 1: EXECUTION */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 via-[#101014] to-[#0a0a0b] p-3.5 transition hover:border-indigo-500/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg border border-indigo-500/30 bg-indigo-500/15 p-1 text-indigo-400">
                  <CheckCircle className="h-3.5 w-3.5" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400/80">
                  Tasks
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-1 leading-none">
                  {tasksCount}
                </div>
                <div className="mt-1 text-[11px] font-bold text-slate-200 leading-tight">
                  Completed
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400">
              <span className="flex items-center gap-0.5 truncate text-slate-400">
                <Zap className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                <span className="truncate">{tasksCount >= 5 ? "Flow State" : "Logged"}</span>
              </span>
            </div>
          </div>

          {/* CARD 2: DISCIPLINE */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 via-[#101014] to-[#0a0a0b] p-3.5 transition hover:border-amber-500/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 p-1 text-amber-400">
                  <Trophy className="h-3.5 w-3.5" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">
                  Habits
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-1 leading-none">
                  {highestStreak}
                  <span className="text-[10px] font-normal text-slate-400">d</span>
                </div>
                <div className="mt-1 text-[11px] font-bold text-slate-200 truncate leading-tight">
                  Top Streak
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400">
              <span className="truncate text-slate-300">
                {topHabit.habitIcon} {topHabit.habitName}
              </span>
            </div>
          </div>

          {/* CARD 3: GROCERY FUEL */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-[#101014] to-[#0a0a0b] p-3.5 transition hover:border-emerald-500/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 p-1 text-emerald-400">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80">
                  Fuel
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-0.5 leading-none">
                  {grocerySpend.toLocaleString(undefined, {
                    minimumFractionDigits: grocerySpend % 1 === 0 ? 0 : 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="mt-1 text-[11px] font-bold text-slate-200 truncate leading-tight">
                  Groceries
                </div>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] text-slate-400">
              <span className="flex items-center gap-0.5 text-slate-400 truncate">
                <TrendingUp className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                <span>{currency}</span>
              </span>
              <span className="text-slate-400">{summary.groceryItemCount} items</span>
            </div>
          </div>
        </div>

        {/* COMPACT ARCHETYPE WRAPPED CARD */}
        <div className={`rounded-2xl border ${archetype.border} bg-white/[0.02] p-3.5 flex items-center gap-3 backdrop-blur-xs`}>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.05] p-2 text-base shrink-0">
            <Award className={`h-4 w-4 ${archetype.accent}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                Weekly Archetype
              </span>
              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-white/[0.06] ${archetype.accent}`}>
                {archetype.badge}
              </span>
            </div>
            <h4 className={`text-sm font-black tracking-tight bg-gradient-to-r ${archetype.color} bg-clip-text text-transparent leading-tight mt-0.5`}>
              {archetype.title}
            </h4>
            <p className="text-[10px] text-slate-400 truncate mt-0.5">
              {archetype.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* COMPACT PINNED FOOTER */}
      <div className="px-5 py-3 border-t border-white/[0.06] bg-[#0c0c0e] flex items-center justify-between gap-3 shrink-0">
        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          Reset complete · Ready for the week
        </span>
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto ml-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#703ceb] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#703ceb]/25 hover:bg-[#5f2fd6] transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <span>Close Review</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {content}
    </div>
  );
}
