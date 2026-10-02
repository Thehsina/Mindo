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

  const renderTaskRow = (task) => {
    const priority = priorityMeta[task.priority || "None"];
    const textClass = task.completed ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-900 dark:text-white";
    const taskSubtasks = subtasksByTask[task.id] || [];
    const completedSubtasks = taskSubtasks.filter((subtask) => subtask.completed).length;
    const progressPercent = taskSubtasks.length ? (completedSubtasks / taskSubtasks.length) * 100 : 0;

    return (
      <div key={task.id} className="group border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1e] dark:hover:bg-[#222226] transition-colors">
        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={Boolean(task.completed)}
            onChange={() => dispatch(toggleTaskFirestore(task))}
            className="h-5 w-5 accent-indigo-600 rounded cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {priority.mark && (
                <span className="text-rose-500 font-bold shrink-0 text-sm">{priority.mark}</span>
              )}
              <span className={`${textClass} font-semibold truncate`}>
                {task.title || "(Untitled)"}
              </span>
            </div>

            {taskSubtasks.length > 0 && (
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <span>{completedSubtasks} of {taskSubtasks.length} completed</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {task.dueDate && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate font-medium">{formatDue(task.dueDate)}</p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => openInfo(task)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              aria-label="Task details"
            >
              <InfoIcon />
            </button>
            <button
              type="button"
              onClick={() => dispatch(deleteTaskFirestore(task.id))}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
              aria-label="Delete task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <button
        type="button"
        onClick={() => openInfo(createEmptyDraft())}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-[#1a1a1e] dark:hover:bg-[#222226] px-4 py-4 text-slate-600 dark:text-slate-400 font-medium transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add a new task
      </button>

      <div className="mt-3 flex-1 min-h-0 overflow-y-auto pr-2 space-y-3">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] px-6 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No tasks match this view</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create a fresh task or adjust your filters.</p>
            </div>
          </div>
        ) : (
          tasks.map((task) => renderTaskRow(task))
        )}

        {tasks.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400 py-8 font-medium">No tasks yet — click the button above to get started</p>
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
