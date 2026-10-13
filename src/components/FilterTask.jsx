import { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, Check, RotateCcw } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

const TIMELINE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
];

export default function FilterTask({
  filter = "all",
  setFilter,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const activeStatus = [...STATUS_OPTIONS, ...TIMELINE_OPTIONS].find((o) => o.value === filter);
  const isStatusFiltered = filter !== "all";

  let displayLabel = "Filter";
  if (isStatusFiltered) {
    displayLabel = activeStatus?.label || "Filter";
  }

  return (
    <div className="relative inline-block text-left shrink-0 select-none" ref={dropdownRef}>
      {/* Trigger Button with Filter Icon */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold cursor-pointer outline-none focus:outline-none min-h-[28px] sm:min-h-0 ${
          isStatusFiltered
            ? "border-indigo-300 bg-indigo-50/90 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300"
            : "border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#1a1a1e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222226]"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="More filters"
      >
        <Filter
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
            isStatusFiltered
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 dark:text-slate-400"
          }`}
        />
        <span className="truncate max-w-[55px] sm:max-w-none">{displayLabel}</span>
        {isStatusFiltered && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
        )}
        <ChevronDown
          className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popover with STRICT INTERNAL SCROLL */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 sm:w-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#18181b] p-1.5 shadow-xl overflow-hidden">
          {/* Scrollable Container with contained overscroll to prevent page scrolling */}
          <div className="max-h-60 sm:max-h-72 overflow-y-auto overscroll-contain pr-1 space-y-2 focus:outline-none">
            {/* Status Section */}
            <div>
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Status
              </div>
              <div className="space-y-0.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = filter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilter(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer text-left outline-none ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timeline Section */}
            <div>
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Timeline
              </div>
              <div className="space-y-0.5">
                {TIMELINE_OPTIONS.map((opt) => {
                  const isSelected = filter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFilter(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer text-left outline-none ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear All Option */}
            {isStatusFiltered && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setFilter("all");
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer outline-none"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}