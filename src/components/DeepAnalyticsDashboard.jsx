import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Flame,
  Calendar,
  AlertTriangle,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { formatLocalDate } from "../utils/dateUtils.js";

/**
 * Custom Dark/Light Tooltip for Recharts
 */
function CustomChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#16171a]/95 p-3.5 shadow-2xl backdrop-blur-md text-xs text-slate-900 dark:text-white min-w-[150px]">
        <div className="font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-2">
          {data.name} <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({data.range})</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#703ceb]/50" />
              Budget:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{data.Budget} AED</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  data.isOverBudget ? "bg-[#ef4444]" : "bg-[#703ceb]"
                }`}
              />
              Actual Spend:
            </span>
            <span
              className={`font-black ${
                data.isOverBudget ? "text-[#ef4444]" : "text-slate-900 dark:text-white"
              }`}
            >
              {data.Spend} AED
            </span>
          </div>
        </div>
        {data.isOverBudget && (
          <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-1 text-[10px] font-bold text-[#ef4444]">
            <AlertTriangle className="h-3 w-3" />
            <span>Over budget by {(data.Spend - data.Budget).toFixed(1)} AED</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function DeepAnalyticsDashboard() {
  // 1. Redux Selectors for raw analytics data
  const expenses = useSelector((state) => (Array.isArray(state?.expenses) ? state.expenses : []));
  const weeklyBudget = useSelector((state) => state?.profile?.weekly_grocery_budget || 120);
  const habits = useSelector((state) => state?.habits?.habits || []);
  const completions = useSelector((state) => state?.habits?.completions || []);

  const [hoveredCell, setHoveredCell] = useState(null);

  // 2. Format Last 4 Weeks of Grocery Spend vs. Budget
  const groceryChartData = useMemo(() => {
    const weeks = [];
    const now = new Date();
    const budgetNum = Number(weeklyBudget) || 120;

    for (let i = 3; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);

      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      const startStr = formatLocalDate(start);
      const endStr = formatLocalDate(end);

      const weekSpend = expenses
        .filter((e) => {
          if (!e) return false;
          const type = (e.type || e.transaction_type || "expense").toLowerCase();
          if (type === "income") return false;

          const category = (e.category || "").toLowerCase();
          if (!category.includes("grocer")) return false;

          const d = String(e.date || e.createdAt || e.created_at || "").slice(0, 10);
          return d >= startStr && d <= endStr;
        })
        .reduce((sum, item) => {
          const val = typeof item.amount === "number" ? item.amount : parseFloat(item.amount) || 0;
          return sum + (Number.isNaN(val) ? 0 : val);
        }, 0);

      const roundedSpend = Math.round(weekSpend * 100) / 100;
      const isOverBudget = roundedSpend > budgetNum;

      weeks.push({
        name: i === 0 ? "This Week" : i === 1 ? "Last Week" : `${i}w ago`,
        range: `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        Budget: budgetNum,
        Spend: roundedSpend,
        isOverBudget,
      });
    }

    return weeks;
  }, [expenses, weeklyBudget]);

  // Total spend across the 4 weeks
  const total4WeekSpend = useMemo(
    () => groceryChartData.reduce((acc, curr) => acc + curr.Spend, 0),
    [groceryChartData]
  );

  // 3. GitHub-Style Habit Completion Heatmap Grid (Last 12 Weeks / 84 Days)
  const heatmapData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Build completion frequency map by YYYY-MM-DD
    const completionCountMap = new Map();
    for (const c of completions) {
      if (c && c.completed && c.date) {
        const cleanDate = String(c.date).trim().slice(0, 10);
        completionCountMap.set(cleanDate, (completionCountMap.get(cleanDate) || 0) + 1);
      }
    }

    // Determine current day offset to end on today (Sunday=0, Monday=1, ... Saturday=6)
    // We display 12 weeks of columns (7 rows each: Mon to Sun)
    const currentDayOfWeek = (today.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const totalDays = 12 * 7;
    const startOffset = totalDays - 1 - currentDayOfWeek;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - startOffset);

    let dayCursor = new Date(startDate);
    for (let w = 0; w < 12; w++) {
      const daysInWeek = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = formatLocalDate(dayCursor);
        const count = completionCountMap.get(dateStr) || 0;
        const isFuture = dayCursor > today;

        daysInWeek.push({
          date: dateStr,
          dayName: dayCursor.toLocaleDateString(undefined, { weekday: "short" }),
          formattedDate: dayCursor.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          count,
          isFuture,
        });

        dayCursor.setDate(dayCursor.getDate() + 1);
      }
      weeks.push(daysInWeek);
    }

    return weeks;
  }, [completions]);

  // Color mapper based on habit completions count
  const getHeatmapColor = (count, isFuture) => {
    if (isFuture) return "bg-transparent border border-black/[0.04] dark:border-white/[0.02]";
    if (count === 0) return "bg-slate-100 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/25";
    if (count === 1) return "bg-[#703ceb]/30 border border-[#703ceb]/45";
    if (count === 2) return "bg-[#703ceb]/55 border border-[#703ceb]/70";
    if (count === 3 || count === 4) return "bg-[#703ceb]/80 border border-[#703ceb]/90";
    return "bg-[#703ceb] border border-[#9b72f5] shadow-xs shadow-[#703ceb]/40";
  };

  const totalCompletionsCount = useMemo(
    () => completions.filter((c) => c?.completed).length,
    [completions]
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 select-none">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#703ceb]/40 bg-[#703ceb]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#703ceb] dark:text-[#9b72f5]">
              <Sparkles className="h-3 w-3" />
              Deep Analytics
            </span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Performance & Insights
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time visual tracking for your grocery budgets, habit compounding, and weekly execution.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-[#121214] px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xs self-start sm:self-auto">
          <Calendar className="h-4 w-4 text-[#703ceb]" />
          <span>Last 4–12 Weeks</span>
        </div>
      </div>

      {/* BENTO GRID CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* CARD 1: RECHARTS GROCERY BUDGET VS ACTUAL SPEND */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-sm dark:shadow-2xl flex flex-col justify-between transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-[#703ceb]/30 bg-[#703ceb]/10 p-2 text-[#703ceb]">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Expense Analytics
                  </span>
                </div>
                <h3 className="mt-2.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Grocery Budget vs. Actual Spend
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Weekly 120 AED Target compared against grocery logs
                </p>
              </div>

              <div className="text-right">
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {total4WeekSpend.toFixed(0)} <span className="text-xs text-slate-500 dark:text-slate-400">AED</span>
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                  4-Week Total
                </span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="mt-4 flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#703ceb]/40" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Weekly Target</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#703ceb]" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">On-Budget Spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#ef4444]" />
                <span className="text-slate-600 dark:text-slate-400 font-medium">Over-Budget</span>
              </div>
            </div>

            {/* Recharts Responsive BarChart */}
            <div className="mt-6 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groceryChartData}
                  margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                  barGap={6}
                >
                  {/* Clean transparent dark theme: zero axis/grid lines */}
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}`}
                  />
                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                  />

                  {/* Budget Bar */}
                  <Bar
                    dataKey="Budget"
                    name="Grocery Budget"
                    fill="#703ceb"
                    fillOpacity={0.3}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />

                  {/* Actual Spend Bar with Dynamic Warning Red on Overbudget */}
                  <Bar
                    dataKey="Spend"
                    name="Actual Spend"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  >
                    {groceryChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isOverBudget ? "#ef4444" : "#703ceb"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
              <TrendingUp className="h-3.5 w-3.5 text-[#703ceb]" />
              Target set at {weeklyBudget} AED / week
            </span>
            <span className="text-[10px] font-bold text-[#703ceb] bg-[#703ceb]/10 px-2 py-0.5 rounded-lg border border-[#703ceb]/20">
              Expenses Slice
            </span>
          </div>
        </div>

        {/* CARD 2: TAILWIND GITHUB-STYLE HABIT CONTRIBUTION HEATMAP */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-sm dark:shadow-2xl flex flex-col justify-between transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-amber-500 dark:text-amber-400">
                    <Flame className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Habit Consistency
                  </span>
                </div>
                <h3 className="mt-2.5 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Consistency Heatmap
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Daily habit completions across the last 12 weeks
                </p>
              </div>

              <div className="text-right">
                <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {totalCompletionsCount}
                </span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                  Completions
                </span>
              </div>
            </div>

            {/* Custom Tailwind Contribution Heatmap Grid */}
            <div className="mt-6 flex flex-col items-center sm:items-start overflow-x-auto no-scrollbar">
              <div className="flex gap-2">
                {/* Day Labels Column */}
                <div className="flex flex-col justify-between text-[9px] font-extrabold text-slate-400 dark:text-slate-500 pr-1.5 py-0.5 h-[116px]">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                  <span>Sun</span>
                </div>

                {/* Heatmap Columns (12 Weeks) */}
                <div className="flex gap-1.5">
                  {heatmapData.map((week, wIndex) => (
                    <div key={`week-${wIndex}`} className="flex flex-col gap-1.5">
                      {week.map((day) => (
                        <div
                          key={day.date}
                          onMouseEnter={() => setHoveredCell(day)}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-[3.5px] transition-all duration-150 cursor-pointer ${getHeatmapColor(
                            day.count,
                            day.isFuture
                          )} ${
                            hoveredCell?.date === day.date
                              ? "scale-125 z-10 ring-2 ring-indigo-500 dark:ring-white"
                              : "hover:scale-110"
                          }`}
                          title={
                            day.isFuture
                              ? `${day.formattedDate}: Future`
                              : `${day.count} completion${day.count === 1 ? "" : "s"} on ${day.formattedDate}`
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hover Details Preview Pill */}
              <div className="mt-3.5 h-6 flex items-center text-xs">
                {hoveredCell && !hoveredCell.isFuture ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/40">
                    <CheckCircle className="h-3 w-3 text-[#703ceb]" />
                    <span>
                      {hoveredCell.count} habits completed on {hoveredCell.dayName},{" "}
                      {hoveredCell.formattedDate}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                    Hover over any square to view daily completions
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer & Heatmap Legend */}
          <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {habits.filter((h) => !h.paused).length} Active Habits Tracked
            </span>

            {/* Heatmap Swatch Legend */}
            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              <span>Less</span>
              <span className="h-2.5 w-2.5 rounded-[2px] bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/25" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#703ceb]/30 border border-[#703ceb]/45" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#703ceb]/55 border border-[#703ceb]/70" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#703ceb]/80 border border-[#703ceb]/90" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#703ceb] border border-[#9b72f5]" />
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
