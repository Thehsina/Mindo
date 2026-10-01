const DEFAULT_CATEGORIES = ["Work", "Personal", "Health", "Shopping"];

export default function FilterTask({
  filter,
  setFilter,
}) {
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
    <div className="flex gap-2 flex-wrap justify-end">
      {pills.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setFilter(value)}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === value
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}