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
    if (p === "high") return "bg-red-500/20 text-red-200 border border-red-500/30 font-medium";
    if (p === "medium") return "bg-amber-500/20 text-amber-200 border border-amber-500/30 font-medium";
    if (p === "low") return "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-medium";
    return "bg-white/10 text-white/70 border border-white/20";
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass p-3 cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggle(task)}
          className="w-4 h-4 accent-purple-500 cursor-pointer shrink-0 mt-0.5"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          {...attributes}
          {...listeners}
          className="flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        >
          <h4 className={`font-medium text-sm ${
            task.completed ? "line-through text-cyan-300/40" : "text-white"
          }`}>
            {task.title}
          </h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority)}`}>
              {task.priority}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30">
              {task.category === "Work" && "💼"}
              {task.category === "Personal" && "👤"}
              {task.category === "Health" && "🏥"}
              {task.category === "Shopping" && "🛒"}
              {" " + task.category}
            </span>
            {task.dueDate && (
              <span className="text-xs text-pink-300/70">
                Due: {formatDate(task.dueDate)}
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
    <div className="flex-1 min-w-0">
      <div
        ref={setNodeRef}
        className={`glass-card p-4 h-full transition-colors ${
          isOver ? "bg-purple-500/20 border-purple-400/50" : ""
        }`}
      >
        <h3 className="text-lg font-semibold mb-4 text-cyan-300 flex items-center gap-2">
          {title === "To Do" && "📋"}
          {title === "In Progress" && "⚡"}
          {title === "Completed" && "✅"}
          {title} ({tasks.length})
        </h3>
        <div className="space-y-3 min-h-[200px] overflow-y-auto">
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
            <div className="text-center text-cyan-300/40 py-8 text-sm">
              Drop tasks here
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
  const tasks = filteredTasks || allTasks; // Use filtered tasks if provided, otherwise all tasks
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Organize tasks into columns based on status
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

    // Determine the target column based on the over element
    let newStatus = activeTask.status;

    if (over.id === "todo-column") {
      newStatus = "todo";
    } else if (over.id === "in-progress-column") {
      newStatus = "in-progress";
    } else if (over.id === "completed-column") {
      newStatus = "completed";
    } else {
      // Check if dropped on another task - use that task's column
      const overTask = tasks.find(task => task.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Only update if status changed
    if (newStatus !== activeTask.status) {
      dispatch(updateTaskStatusFirestore(active.id, newStatus));
    }

    setActiveId(null);
  }

  const activeTask = activeId ? tasks.find(task => task.id === activeId) : null;

  return (
    <div className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <div className="glass p-3 rotate-3 opacity-90">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={activeTask.completed}
                  className="w-4 h-4 accent-purple-500 shrink-0 mt-0.5"
                  readOnly
                />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm ${
                    activeTask.completed ? "line-through text-cyan-300/40" : "text-white"
                  }`}>
                    {activeTask.title}
                  </h4>
                  {activeTask.description && (
                    <p className={`text-xs mt-1 text-cyan-300/70 ${
                      activeTask.completed ? "line-through" : ""
                    }`}>
                      {activeTask.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}