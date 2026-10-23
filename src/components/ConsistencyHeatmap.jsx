// src/components/ConsistencyHeatmap.jsx
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Flame, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatLocalDate } from "../utils/dateUtils";

export default function ConsistencyHeatmap() {
  const habits = useSelector((state) => state?.habits?.habits || []);
  const completions = useSelector((state) => state?.habits?.completions || []);
  const [hoveredCell, setHoveredCell] = useState(null);

  // 12 Weeks (84 Days) Heatmap Data
  const heatmapData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const completionCountMap = new Map();
    for (const c of completions) {
      if (c && c.completed && c.date) {
        const cleanDate = String(c.date).trim().slice(0, 10);
        completionCountMap.set(cleanDate, (completionCountMap.get(cleanDate) || 0) + 1);
      }
    }

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

  const getHeatmapColor = (count, isFuture) => {
    if (isFuture) return "bg-transparent border border-black/[0.04] dark:border-white/[0.02]";
    if (count === 0) return "bg-slate-100 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/25";
    if (count === 1) return "bg-[#703ceb]/30 border border-[#703ceb]/45";
    if (count === 2) return "bg-[#703ceb]/55 border border-[#703ceb]/70";
    if (count === 3 || count === 4) return "bg-[#703ceb]/80 border border-[#703ceb]/90";
    return "bg-[#703ceb] border border-[#9b72f5] shadow-xs shadow-[#703ceb]/40";
  };

  const totalCompletions = useMemo(
    () => completions.filter((c) => c?.completed).length,
    [completions]
  );

  const activeHabitsCount = habits.filter((h) => !h.paused && !h.archived).length;

  return (
    <div className="bento-card !p-2 sm:!p-2.5 md:!p-3 shrink-0 flex flex-col justify-between rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#121214] shadow-2xs select-none">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 shrink-0 mb-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
          <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Consistency Heatmap
          </span>
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline">
            · Last 12 Weeks
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="text-slate-900 dark:text-white font-black">{totalCompletions}</span> completions
          </span>
          <Link
            to="/habits"
            className="text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
          >
            <span>{activeHabitsCount} habits</span>
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </Link>
        </div>
      </div>

      {/* Main Heatmap Area with Weekday Labels */}
      <div className="flex items-center justify-between gap-2 py-0.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0 mx-auto sm:mx-0">
          {/* Day of Week Labels */}
          <div className="flex flex-col justify-between text-[8px] sm:text-[9px] font-extrabold text-slate-400 dark:text-slate-500 pr-1 h-[78px] sm:h-[88px] shrink-0 leading-none">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span>Sun</span>
          </div>

          {/* 12-Week Grid Columns */}
          <div className="flex gap-1 sm:gap-1.5">
            {heatmapData.map((week, wIndex) => (
              <div key={`col-${wIndex}`} className="flex flex-col gap-1 sm:gap-1.5">
                {week.map((day) => (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredCell(day)}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-[2.5px] transition-all duration-150 cursor-pointer ${getHeatmapColor(
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

        {/* Desktop Side Info / Legend */}
        <div className="hidden lg:flex flex-col items-end justify-between h-[88px] pl-3 shrink-0 text-right">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {hoveredCell && !hoveredCell.isFuture ? (
              <span className="inline-flex items-center gap-1 text-slate-900 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-3 h-3 text-[#703ceb]" />
                {hoveredCell.count} completed · {hoveredCell.formattedDate}
              </span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic text-[10px]">
                Hover a square for details
              </span>
            )}
          </div>

          {/* Swatch Legend */}
          <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-slate-500">
            <span>Less</span>
            <span className="h-2 w-2 rounded-[2px] bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/25" />
            <span className="h-2 w-2 rounded-[2px] bg-[#703ceb]/30 border border-[#703ceb]/45" />
            <span className="h-2 w-2 rounded-[2px] bg-[#703ceb]/55 border border-[#703ceb]/70" />
            <span className="h-2 w-2 rounded-[2px] bg-[#703ceb]/80 border border-[#703ceb]/90" />
            <span className="h-2 w-2 rounded-[2px] bg-[#703ceb] border border-[#9b72f5]" />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Mobile/Compact Hover Status & Legend row */}
      <div className="flex lg:hidden items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        <div>
          {hoveredCell && !hoveredCell.isFuture ? (
            <span className="text-slate-900 dark:text-white font-bold">
              {hoveredCell.count} on {hoveredCell.formattedDate}
            </span>
          ) : (
            <span>Daily Compounding</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span>Less</span>
          <span className="h-2 w-2 rounded-[2px] bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/25" />
          <span className="h-2 w-2 rounded-[2px] bg-[#703ceb]/30" />
          <span className="h-2 w-2 rounded-[2px] bg-[#703ceb]/60" />
          <span className="h-2 w-2 rounded-[2px] bg-[#703ceb]" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
