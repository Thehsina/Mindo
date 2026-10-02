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

import { formatDue } from "../utils/dateUtils";

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