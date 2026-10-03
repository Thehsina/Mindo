// src/components/TaskList.jsx
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import {
  addTaskFirestore,
  updateTaskFirestore,
  toggleTaskFirestore,
  deleteTaskFirestore,
} from "../redux/tasksSlice";
import { fetchTaskSubtasks, createTaskSubtask, toggleTaskSubtask, deleteTaskSubtask } from "../utils/subtasks";
import TaskDetailsModal, { priorityMeta } from "./TaskDetailsModal";
import FocusModeModal from "./FocusModeModal";
import { InfoIcon } from "./Icons";
import { Plus, Trash2 } from "lucide-react";

import { formatDue, buildDueDate, parseTaskDate } from "../utils/dateUtils";

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

const taskToFormState = (task) => {
  const parsed = parseTaskDate(task.dueDate, task.timeEnabled ?? task.hasTime);

  let locationType = task.locationType || "none";
  if (!task.locationType && task.locationReminder) {
    const name = task.locationName || "";
    if (name === "Current") locationType = "current";
    else if (name === "Getting In") locationType = "gettingOut";
    else if (name === "Getting Out") locationType = "gettingOut";
    else if (name) locationType = "custom";
  }

  return {
    id: task.id || "new",
    title: task.title || "",
    note: task.note || "",
    dueDate: parsed.dateStr,
    dueTime: parsed.timeStr,
    dateEnabled: parsed.dateEnabled,
    timeEnabled: parsed.timeEnabled,
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
  const [infoSubtasks, setInfoSubtasks] = useState([]);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [subtasksByTask, setSubtasksByTask] = useState({});
  const [focusTask, setFocusTask] = useState(null);

  useEffect(() => {
    if (!tasks.length) {
      setSubtasksByTask({});
      return;
    }

    let active = true;

    const load = async () => {
      const nextState = {};
      for (const task of tasks) {
        if (!task?.id || task.id === "new") continue;
        try {
          nextState[task.id] = await fetchTaskSubtasks(task.id);
        } catch (error) {
          console.error("Failed to load subtasks:", error);
          nextState[task.id] = [];
        }
      }

      if (active) setSubtasksByTask(nextState);
    };

    load();
    return () => { active = false; };
  }, [tasks]);

  const loadSubtasksForTask = async (taskId) => {
    if (!taskId || taskId === "new") {
      setInfoSubtasks([]);
      return;
    }

    try {
      const taskSubtasks = await fetchTaskSubtasks(taskId);
      setInfoSubtasks(taskSubtasks);
      setSubtasksByTask((prev) => ({ ...prev, [taskId]: taskSubtasks }));
    } catch (error) {
      console.error("Could not load task subtasks:", error);
      setInfoSubtasks([]);
    }
  };

  const openInfo = async (task) => {
    setInfoErrors({});
    setSubtaskDraft("");
    setInfoTask(taskToFormState(task));
    await loadSubtasksForTask(task?.id);
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

  const handleAddSubtask = async () => {
    if (!infoTask?.id || infoTask.id === "new") return;
    const title = subtaskDraft.trim();
    if (!title) return;

    try {
      const created = await createTaskSubtask(infoTask.id, title);
      if (!created) return;

      const next = [...infoSubtasks, created];
      setInfoSubtasks(next);
      setSubtasksByTask((prev) => ({ ...prev, [infoTask.id]: next }));
      setSubtaskDraft("");
    } catch (error) {
      console.error("Add subtask failed:", error);
      setInfoErrors({ form: "Unable to add subtask right now." });
    }
  };

  const handleToggleSubtask = async (subtaskId, nextCompleted) => {
    if (!infoTask?.id || !subtaskId) return;

    try {
      await toggleTaskSubtask(infoTask.id, subtaskId, nextCompleted);
      const next = infoSubtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, completed: Boolean(nextCompleted) } : subtask
      );
      setInfoSubtasks(next);
      setSubtasksByTask((prev) => ({ ...prev, [infoTask.id]: next }));
    } catch (error) {
      console.error("Toggle subtask failed:", error);
      setInfoErrors({ form: "Unable to update this step right now." });
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!infoTask?.id || !subtaskId) return;

    try {
      await deleteTaskSubtask(infoTask.id, subtaskId);
      const next = infoSubtasks.filter((subtask) => subtask.id !== subtaskId);
      setInfoSubtasks(next);
      setSubtasksByTask((prev) => ({ ...prev, [infoTask.id]: next }));
    } catch (error) {
      console.error("Delete subtask failed:", error);
      setInfoErrors({ form: "Unable to remove this step right now." });
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
      console.error(`Save failed: ${err && err.stack ? err.stack : err}`);
      setInfoErrors({ form: err?.message || "Failed to save task. Please try again." });
    }
  };

  const getPriorityDot = (p) => {
    const val = (p || "").toLowerCase();
    if (val === "high") return "bg-rose-500 shadow-xs shadow-rose-500/50";
    if (val === "medium") return "bg-amber-500 shadow-xs shadow-amber-500/50";
    if (val === "low") return "bg-blue-400 shadow-xs shadow-blue-400/50";
    return "bg-slate-300 dark:bg-slate-700 opacity-40";
  };

  const renderTaskRow = (task) => {
    const taskSubtasks = subtasksByTask[task.id] || [];
    const completedSubtasks = taskSubtasks.filter((subtask) => subtask.completed).length;

    return (
      <div
        key={task.id}
        className="group flex items-center justify-between gap-2.5 border border-slate-200/80 dark:border-slate-800/60 rounded-xl px-3 py-2.5 sm:py-2 bg-slate-50/80 hover:bg-slate-100/90 dark:bg-[#1a1a1e]/80 dark:hover:bg-[#222226] transition-all duration-150 max-w-full overflow-hidden min-h-[48px]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Checkbox with min 44px touch target on mobile */}
          <div
            onClick={() => dispatch(toggleTaskFirestore(task))}
            className="flex items-center justify-center min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 cursor-pointer shrink-0"
          >
            <input
              type="checkbox"
              checked={Boolean(task.completed)}
              onChange={() => {}}
              aria-label={task.completed ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
              className="h-4.5 w-4.5 accent-indigo-600 rounded cursor-pointer shrink-0"
            />
          </div>

          <span
            className={`h-2.5 w-2.5 rounded-full shrink-0 ${getPriorityDot(task.priority)}`}
            title={`Priority: ${task.priority || "None"}`}
          />

          <span
            onClick={() => openInfo(task)}
            className={`text-xs sm:text-sm font-semibold truncate sm:whitespace-nowrap cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-1 min-w-0 ${
              task.completed ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-900 dark:text-white"
            }`}
          >
            {task.title || "(Untitled)"}
          </span>

          {taskSubtasks.length > 0 && (
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded-md shrink-0">
              {completedSubtasks}/{taskSubtasks.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {task.dueDate && (
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {formatDue(task.dueDate)}
            </span>
          )}

          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => openInfo(task)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
              aria-label="Task details"
            >
              <InfoIcon />
            </button>
            <button
              type="button"
              onClick={() => dispatch(deleteTaskFirestore(task.id))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors min-h-[36px] min-w-[36px] sm:min-h-0 sm:min-w-0 flex items-center justify-center cursor-pointer"
              aria-label="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="md:flex-1 flex flex-col md:min-h-0 md:overflow-hidden max-w-full">
      {/* Header Row with Task List title & Add task button */}
      <div className="flex items-center justify-between gap-3 mb-2.5 shrink-0">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Task List
          <span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 px-2 py-0.5 text-xs font-bold">
            {tasks.length}
          </span>
        </h2>

        <button
          type="button"
          onClick={() => openInfo(createEmptyDraft())}
          className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-2 sm:py-1.5 text-xs font-bold text-white shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          <span>Add task</span>
        </button>
      </div>

      {/* Task list area */}
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto pr-0 sm:pr-1 space-y-1.5 max-w-full">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] px-4 py-8 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No tasks match this view</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Click "Add task" to create one.</p>
            </div>
          </div>
        ) : (
          tasks.map((task) => renderTaskRow(task))
        )}
      </div>

      {infoTask && (
        <TaskDetailsModal
          task={infoTask}
          errors={infoErrors}
          subtasks={infoSubtasks}
          subtaskDraft={subtaskDraft}
          onChange={handleInfoChange}
          onClose={closeInfo}
          onSave={saveInfo}
          onSubtaskDraftChange={setSubtaskDraft}
          onAddSubtask={handleAddSubtask}
          onToggleSubtask={handleToggleSubtask}
          onDeleteSubtask={handleDeleteSubtask}
          onOpenFocusMode={() => setFocusTask(infoTask)}
        />
      )}

      {focusTask && (
        <FocusModeModal
          task={focusTask}
          onClose={() => setFocusTask(null)}
          subtasks={infoSubtasks}
          onCompleteTask={() => {
            dispatch(updateTaskFirestore({ ...focusTask, completed: true, status: "completed" }));
            setFocusTask(null);
            closeInfo();
          }}
        />
      )}
    </div>
  );
}
