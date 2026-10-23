// src/components/GroceryBudgetCard.jsx
import { useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { BarChart3, TrendingUp, AlertTriangle, Wallet, Edit2, Check, X } from "lucide-react";
import { formatLocalDate } from "../utils/dateUtils.js";
import { setWeeklyGroceryBudget } from "../redux/profileSlice.js";

function CustomChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-[#16171a]/95 p-2.5 shadow-xl backdrop-blur-md text-[11px] text-slate-900 dark:text-white min-w-[130px]">
        <div className="font-extrabold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1 mb-1 flex items-center justify-between">
          <span>{data.name}</span>
          <span className="text-[9px] font-normal text-slate-500 dark:text-slate-400">({data.range})</span>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#703ceb]/50" />
              Budget:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{data.Budget} AED</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  data.isOverBudget ? "bg-[#ef4444]" : "bg-[#703ceb]"
                }`}
              />
              Spend:
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
          <div className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1 text-[9px] font-bold text-[#ef4444]">
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
            <span>+{(data.Spend - data.Budget).toFixed(1)} AED over</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function GroceryBudgetCard({ onOpenBudgetModal, onCloseMobile }) {
  const dispatch = useDispatch();
  const expenses = useSelector((state) => (Array.isArray(state?.expenses) ? state.expenses : []));
  const weeklyBudget = useSelector((state) => state?.profile?.weekly_grocery_budget || 120);

  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineBudget, setInlineBudget] = useState(String(weeklyBudget));

  const budgetNum = Number(weeklyBudget) || 120;

  // 4 Weeks Grocery Spending vs. Budget Data
  const chartData = useMemo(() => {
    const weeks = [];
    const now = new Date();

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
        name: i === 0 ? "This Wk" : i === 1 ? "Last Wk" : `${i}w ago`,
        range: `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
        Budget: budgetNum,
        Spend: roundedSpend,
        isOverBudget,
      });
    }

    return weeks;
  }, [expenses, budgetNum]);

  const total4WeekSpend = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.Spend, 0),
    [chartData]
  );

  const handleSaveInlineBudget = () => {
    const val = parseFloat(inlineBudget);
    if (!Number.isNaN(val) && val >= 0) {
      dispatch(setWeeklyGroceryBudget(val));
    }
    setIsEditingInline(false);
  };

  return (
    <div className="bento-card !p-2.5 sm:!p-3 rounded-2xl flex flex-col justify-between border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs select-none">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="rounded-lg border border-[#703ceb]/30 bg-[#703ceb]/10 p-1 text-[#703ceb] shrink-0">
              <BarChart3 className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate">
                Budget vs. Spend
              </h3>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                4-Week Trend
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="text-right">
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-none">
                {total4WeekSpend.toFixed(0)} <span className="text-[9px] text-slate-400 font-semibold">AED</span>
              </span>
            </div>

            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                title="Collapse chart"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Legend & Inline Target */}
        <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-xs bg-[#703ceb]/40" />
              <span>Target</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-xs bg-[#703ceb]" />
              <span>Spend</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-xs bg-[#ef4444]" />
              <span>Over</span>
            </div>
          </div>

          {/* Quick Target Display / Inline Edit */}
          {isEditingInline ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inlineBudget}
                onChange={(e) => setInlineBudget(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveInlineBudget()}
                className="w-12 px-1 py-0.5 rounded border border-[#703ceb] bg-slate-50 dark:bg-slate-900 text-[10px] text-center font-bold outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveInlineBudget}
                className="p-0.5 rounded bg-[#703ceb] text-white"
              >
                <Check className="w-2.5 h-2.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onOpenBudgetModal) {
                  onOpenBudgetModal();
                } else {
                  setInlineBudget(String(weeklyBudget));
                  setIsEditingInline(true);
                }
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#703ceb]/10 text-[#703ceb] dark:text-[#9b72f5] border border-[#703ceb]/25 font-bold cursor-pointer hover:bg-[#703ceb]/20 transition"
              title="Change weekly target"
            >
              <Wallet className="w-2.5 h-2.5" />
              <span>{weeklyBudget} AED/wk</span>
              <Edit2 className="w-2 h-2 opacity-60" />
            </button>
          )}
        </div>

        {/* Compact Responsive BarChart */}
        <div className="mt-1.5 h-24 sm:h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 0, left: -30, bottom: 0 }}
              barGap={4}
            >
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip
                content={<CustomChartTooltip />}
                cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
              />

              <Bar
                dataKey="Budget"
                name="Grocery Budget"
                fill="#703ceb"
                fillOpacity={0.35}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />

              <Bar
                dataKey="Spend"
                name="Actual Spend"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              >
                {chartData.map((entry, index) => (
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

      {/* Footer */}
      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[9px] text-slate-400">
        <span className="flex items-center gap-1">
          <TrendingUp className="h-2.5 w-2.5 text-[#703ceb]" />
          Target: {weeklyBudget} AED
        </span>
        <button
          type="button"
          onClick={onOpenBudgetModal}
          className="font-bold text-[#703ceb] dark:text-[#9b72f5] hover:underline cursor-pointer"
        >
          Change Budget
        </button>
      </div>
    </div>
  );
}
