import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useDroppable,
} from "@dnd-kit/core";
import { updateTaskStatusFirestore, toggleTaskFirestore } from "../redux/tasksSlice";
import { formatDue } from "../utils/dateUtils";

const DEFAULT_CATEGORIES = ["Work", "Personal", "Health", "Shopping"];

function SortableTaskItem({ task, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPriorityStyle = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 font-medium";
    if (p === "medium") return "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium";
    if (p === "low") return "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium";
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return formatDue(timestamp);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#1a1a1e] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-2xs cursor-grab active:cursor-grabbing hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors ${
        isDragging ? "opacity-50 ring-2 ring-indigo-500 shadow-md" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          className="w-4 h-4 accent-indigo-600 rounded cursor-pointer shrink-0 mt-0.5"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          {...attributes}
          {...listeners}
          className="flex-1 min-w-0"
        >
          <h4 className={`font-semibold text-xs sm:text-sm leading-snug ${
            task.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-white"
          }`}>
            {task.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getPriorityStyle(task.priority)}`}>
              {task.priority || "None"}
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
              {task.category || "General"}
            </span>
            {task.dueDate && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium ml-auto">
                {formatDate(task.dueDate)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskColumn({ id, title, tasks, onToggle }) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="w-full md:flex-1 md:min-w-[280px] md:max-w-[400px] shrink-0">
      <div
        ref={setNodeRef}
        className={`bento-card !p-3 sm:!p-4 rounded-2xl h-auto md:h-full flex flex-col border border-slate-200/80 dark:border-slate-800 ${
          isOver ? "ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10" : "bg-slate-50/80 dark:bg-[#121214]"
        }`}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span>{title}</span>
            <span className="bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {tasks.length}
            </span>
          </h3>
        </div>
        
        <div className="space-y-2 md:flex-1 md:space-y-2.5 md:overflow-y-auto md:min-h-[160px] md:pb-2 md:pr-1">
          <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
              />
            ))}
          </SortableContext>
          {tasks.length === 0 && (
            <div className="h-14 sm:h-18 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-400 dark:text-slate-500 text-xs font-medium">
              No tasks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TaskBoard({ tasks: filteredTasks }) {
  const dispatch = useDispatch();
  const allTasks = useSelector((state) => state.tasks);
  const tasks = filteredTasks || allTasks; 
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const todoTasks = tasks.filter(task => task.status === "todo");
  const inProgressTasks = tasks.filter(task => task.status === "in-progress");
  const completedTasks = tasks.filter(task => task.status === "completed");

  const handleToggleTask = (task) => {
    dispatch(toggleTaskFirestore(task));
  };

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(task => task.id === active.id);
    if (!activeTask) {
      setActiveId(null);
      return;
    }

    let newStatus = activeTask.status;

    if (over.id === "todo-column") {
      newStatus = "todo";
    } else if (over.id === "in-progress-column") {
      newStatus = "in-progress";
    } else if (over.id === "completed-column") {
      newStatus = "completed";
    } else {
      const overTask = tasks.find(task => task.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (newStatus !== activeTask.status) {
      dispatch(updateTaskStatusFirestore(active.id, newStatus));
    }

    setActiveId(null);
  }

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null;

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-5 w-full h-full overflow-y-auto md:overflow-x-auto md:overflow-y-hidden pb-4 md:items-start no-scrollbar">
          <TaskColumn
            id="todo-column"
            title="To Do"
            tasks={todoTasks}
            onToggle={handleToggleTask}
          />
          <TaskColumn
            id="in-progress-column"
            title="In Progress"
            tasks={inProgressTasks}
            onToggle={handleToggleTask}
          />
          <TaskColumn
            id="completed-column"
            title="Completed"
            tasks={completedTasks}
            onToggle={handleToggleTask}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="border border-indigo-500/50 bg-white dark:bg-[#1a1a1e] rounded-2xl p-4 shadow-xl rotate-3 scale-105 cursor-grabbing">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={activeTask.completed}
                  className="w-4 h-4 accent-indigo-600 rounded shrink-0 mt-1"
                  readOnly
                />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold text-sm ${
                    activeTask.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"
                  }`}>
                    {activeTask.title}
                  </h4>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}