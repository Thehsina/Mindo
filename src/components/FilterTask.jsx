const DEFAULT_CATEGORIES = ["Work", "Personal", "Health", "Shopping"];

export default function FilterTask({
  filter,
  setFilter,
}) {
  return (
    <div className="flex gap-2 flex-wrap justify-end">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === "all"
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          All
        </button>

        <button
          onClick={() => setFilter("active")}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === "active"
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          Active
        </button>

        <button
          onClick={() => setFilter("completed")}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === "completed"
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          Completed
        </button>

        <button
          onClick={() => setFilter("high")}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === "high"
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          High Priority
        </button>

        <button
          onClick={() => setFilter("medium")}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === "medium"
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          Medium Priority
        </button>

        <button
          onClick={() => setFilter("low")}
          className={`px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${
            filter === "low"
              ? "glass-button"
              : "glass-button-outline"
          }`}
        >
          Low Priority
        </button>
      </div>
  );
}