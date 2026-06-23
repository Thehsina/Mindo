// src/components/TaskItem.jsx
import { useDispatch } from "react-redux";
import {
  toggleTaskFirestore,
  deleteTaskFirestore,
} from "../redux/tasksSlice";

const priorityMeta = {
  Low: { mark: "!", color: "text-emerald-400" },
  Medium: { mark: "!!", color: "text-blue-400" },
  High: { mark: "!!!", color: "text-red-400" },
  None: { mark: "", color: "" },
};

const formatDue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));

  const dateLabel =
    diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : d.toLocaleDateString();

  const timeLabel = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateLabel} ${timeLabel}`;
};

export default function TaskItem({ task, onEdit, onOpenInfo }) {
  const dispatch = useDispatch();

  const priority = priorityMeta[task.priority || "None"];

  return (
    <div
      onClick={() => onEdit(task)}
      className="p-3 rounded-2xl bg-white/10 border border-white/20 cursor-pointer"
    >
      <div className="flex gap-3 items-start">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.completed || false}
          onChange={(e) => {
            e.stopPropagation();
            dispatch(toggleTaskFirestore(task));
          }}
          className="mt-1 h-5 w-5 accent-cyan-500"
        />

        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between">
            <div className="flex gap-2 items-center">
              {priority.mark && (
                <span className={`${priority.color} font-bold`}>
                  {priority.mark}
                </span>
              )}

              <span
                className={`font-semibold text-lg ${
                  task.completed ? "line-through text-gray-400" : "text-white"
                }`}
              >
                {task.title}
              </span>
            </div>

            {/* Info button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenInfo(task);
              }}
              className="w-7 h-7 flex items-center justify-center border rounded-full text-white"
            >
              i
            </button>
          </div>

          {/* Note */}
          {task.note && (
            <p className="text-sm text-gray-300 mt-1">{task.note}</p>
          )}

          {/* Metadata */}
          <p className="text-xs text-gray-400 mt-2">
            {formatDue(task.dueDate)}{" "}
            {task.category && `• ${task.category}`}{" "}
            {task.locationName && `• ${task.locationName}`}
          </p>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch(deleteTaskFirestore(task.id));
          }}
          className="text-red-400 text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  );
}