export default function FilterTask({ filter, setFilter }) {
  const pills = [
    { value: "all", label: "All" },
    { value: "today", label: "Today" },
    { value: "upcoming", label: "Upcoming" },
    { value: "overdue", label: "Overdue" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 shrink-0 max-w-full">
      {pills.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setFilter(value)}
          className={`px-3 py-1.5 rounded-xl cursor-pointer transition text-xs font-bold whitespace-nowrap shrink-0 min-h-[36px] sm:min-h-0 flex items-center justify-center ${
            filter === value
              ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1a1a1e] dark:text-slate-300 dark:hover:bg-[#222226]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}