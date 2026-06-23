// src/components/TaskList.jsx
import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  addTaskFirestore,
  updateTaskFirestore,
  toggleTaskFirestore,
  deleteTaskFirestore,
} from "../redux/tasksSlice";
import TaskDetailsModal, { priorityMeta } from "./TaskDetailsModal";
import { InfoIcon } from "./Icons";

const createEmptyDraft = () => ({
  id: "new",
  title: "",
  note: "",
  dueDate: "",
  dueTime: "",
  dateEnabled: false,
  timeEnabled: false,
  priority: "None",
  list: "Reminders",
  repeat: "Never",
  organization: "",
  placesPeople: "",
  locationType: "none",
  locationReminder: false,
  locationName: "",
  completed: false,
});

const formatDue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Invalid date";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  const dateLabel =
    diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : d.toLocaleDateString();
  const timeLabel = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return `${dateLabel} ${timeLabel}`;
};

const validateTaskFields = ({
  title,
  dateEnabled,
  dueDate,
  timeEnabled,
  dueTime,
  locationType,
  locationName,
}) => {
  const errors = {};
  const trimmedTitle = title?.trim() || "";

  if (!trimmedTitle) {
    errors.title = "Task title is required.";
  } else if (trimmedTitle.length < 2) {
    errors.title = "Task title must be at least 2 characters.";
  }

  if (dateEnabled && !dueDate) {
    errors.dueDate = "Please select a date.";
  }

  if (timeEnabled && dateEnabled && !dueTime) {
    errors.dueTime = "Please select a time.";
  }

  if (locationType === "custom" && !locationName?.trim()) {
    errors.locationName = "Please enter a custom location.";
  }

  return errors;
};

const buildDueDate = (dateEnabled, dueDate, timeEnabled, dueTime) => {
  if (!dateEnabled || !dueDate) return null;
  const d = new Date(`${dueDate}T${timeEnabled && dueTime ? dueTime : "00:00"}:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

const taskToFormState = (task) => {
  let dueDate = "";
  let dueTime = "";

  if (task.dueDate) {
    const d = new Date(task.dueDate);
    if (!Number.isNaN(d.getTime())) {
      dueDate = d.toISOString().slice(0, 10);
      dueTime = d.toTimeString().slice(0, 5);
    }
  }

  let locationType = task.locationType || "none";
  if (!task.locationType && task.locationReminder) {
    const name = task.locationName || "";
    if (name === "Current") locationType = "current";
    else if (name === "Getting In") locationType = "gettingIn";
    else if (name === "Getting Out") locationType = "gettingOut";
    else if (name) locationType = "custom";
  }

  return {
    id: task.id || "new",
    title: task.title || "",
    note: task.note || "",
    dueDate,
    dueTime,
    dateEnabled: Boolean(task.dueDate) || Boolean(task.dateEnabled),
    timeEnabled: Boolean(task.dueDate && dueTime !== "00:00") || Boolean(task.timeEnabled),
    priority: task.priority || "None",
    list: task.category || task.list || "Reminders",
    repeat: task.repeat || "Never",
    organization: task.organization || "",
    placesPeople: task.placesPeople || "",
    locationType,
    locationReminder: task.locationReminder || locationType !== "none",
    locationName: task.locationName || "",
    completed: task.completed || false,
  };
};

export default function TaskList({ tasks }) {
  const dispatch = useDispatch();
  const [infoTask, setInfoTask] = useState(null);
  const [infoErrors, setInfoErrors] = useState({});

  const openInfo = (task) => {
    setInfoErrors({});
    setInfoTask(taskToFormState(task));
  };

  const closeInfo = () => {
    setInfoTask(null);
    setInfoErrors({});
  };

  const handleInfoChange = (updates) => {
    setInfoTask((prev) => ({ ...prev, ...updates }));
    const cleared = {};
    Object.keys(updates).forEach((key) => {
      if (infoErrors[key]) cleared[key] = "";
    });
    if (Object.keys(cleared).length) {
      setInfoErrors((prev) => ({ ...prev, ...cleared }));
    }
  };

  const saveInfo = async () => {
    const errors = validateTaskFields(infoTask);
    if (Object.keys(errors).length > 0) {
      setInfoErrors(errors);
      return;
    }

    const dueDate = buildDueDate(
      infoTask.dateEnabled,
      infoTask.dueDate,
      infoTask.timeEnabled,
      infoTask.dueTime
    );

    const cleaned = {
      title: infoTask.title.trim(),
      note: infoTask.note || "",
      dueDate,
      priority: infoTask.priority || "None",
      category: infoTask.list || "Reminders",
      repeat: infoTask.repeat || "Never",
      organization: infoTask.organization?.trim() || "",
      placesPeople: infoTask.placesPeople?.trim() || "",
      locationType: infoTask.locationType || "none",
      locationReminder: infoTask.locationType !== "none",
      locationName: infoTask.locationName?.trim() || "",
      completed: infoTask.completed || false,
    };

    try {
      if (!infoTask.id || infoTask.id === "new") {
        await dispatch(addTaskFirestore(cleaned));
      } else {
        await dispatch(updateTaskFirestore({ id: infoTask.id, ...cleaned }));
      }
      closeInfo();
    } catch (err) {
      console.error("Save failed:", err);
      setInfoErrors({ form: "Failed to save task. Please try again." });
    }
  };

  const renderTaskRow = (task) => {
    const priority = priorityMeta[task.priority || "None"];
    const textClass = task.completed ? "text-slate-400 line-through" : "text-white";

    return (
      <div key={task.id} className="border rounded-2xl p-3 bg-white/10 border-white/20">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={Boolean(task.completed)}
            onChange={() => dispatch(toggleTaskFirestore(task))}
            className="h-5 w-5 accent-cyan-500 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {priority.mark && (
                <span className="text-red-400 font-bold shrink-0">{priority.mark}</span>
              )}
              <span className={`${textClass} text-lg font-semibold truncate`}>
                {task.title || "(Untitled)"}
              </span>
            </div>
            {task.dueDate && (
              <p className="mt-0.5 text-xs text-slate-400 truncate">{formatDue(task.dueDate)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => openInfo(task)}
            className="info-btn"
            aria-label="Task details"
          >
            <InfoIcon />
          </button>
          <button
            type="button"
            onClick={() => dispatch(deleteTaskFirestore(task.id))}
            className="text-xs text-rose-300 hover:text-rose-400 shrink-0 px-1"
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2 overflow-y-auto min-h-0 flex flex-col">
      <button
        type="button"
        onClick={() => openInfo(createEmptyDraft())}
        className="w-full rounded-2xl border border-dashed border-cyan-400/50 bg-cyan-500/10 px-4 py-3 text-left text-cyan-200 hover:bg-cyan-500/20 transition"
      >
        + Add a new task
      </button>

      {tasks.map((task) => renderTaskRow(task))}

      {tasks.length === 0 && (
        <p className="text-center text-slate-400 py-4">No tasks yet — click the button above to get started</p>
      )}

      {infoTask && (
        <TaskDetailsModal
          task={infoTask}
          errors={infoErrors}
          onChange={handleInfoChange}
          onClose={closeInfo}
          onSave={saveInfo}
        />
      )}
    </div>
  );
}
