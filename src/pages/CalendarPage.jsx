import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { toggleTaskFirestore } from "../redux/tasksSlice";
import "react-big-calendar/lib/css/react-big-calendar.css";

// Setup the localizer for react-big-calendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Custom event component for tasks
function TaskEvent({ event }) {
  const getPriorityStyle = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "bg-red-500/80 text-white border-red-400";
    if (p === "medium") return "bg-amber-500/80 text-white border-amber-400";
    if (p === "low") return "bg-emerald-500/80 text-white border-emerald-400";
    return "bg-purple-500/80 text-white border-purple-400";
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case "Work": return "💼";
      case "Personal": return "👤";
      case "Health": return "🏥";
      case "Shopping": return "🛒";
      default: return "📋";
    }
  };

  return (
    <div className={`glass p-1 rounded text-xs border ${getPriorityStyle(event.priority)}`}>
      <div className="flex items-center gap-1">
        <span>{getCategoryEmoji(event.category)}</span>
        <span className="font-medium truncate">{event.title}</span>
      </div>
      {event.description && (
        <div className="text-xs opacity-90 truncate mt-0.5">
          {event.description}
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const tasks = useSelector((state) => state.tasks);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState("month");
  const [selectedTask, setSelectedTask] = useState(null);

  // Convert tasks to calendar events
  const events = tasks
    .filter(task => task.dueDate) // Only show tasks with due dates
    .map(task => ({
      id: task.id,
      title: task.title,
      start: new Date(task.dueDate),
      end: new Date(task.dueDate),
      allDay: true,
      priority: task.priority,
      category: task.category,
      description: task.description,
      status: task.status,
      completed: task.completed,
      resource: task, // Store full task data
    }));

  const handleEventClick = (event) => {
    setSelectedTask(event.resource);
  };

  const handleTaskToggle = (task) => {
    dispatch(toggleTaskFirestore(task));
    setSelectedTask(null);
  };

  const handleEditTask = () => {
    navigate("/tasks");
    setSelectedTask(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "text-emerald-400";
      case "in-progress": return "text-amber-400";
      case "todo": return "text-blue-400";
      default: return "text-gray-400";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "completed": return "Completed";
      case "in-progress": return "In Progress";
      case "todo": return "To Do";
      default: return "Unknown";
    }
  };

  // Custom calendar styles to match glassmorphic theme
  const calendarStyle = {
    height: "calc(100vh - 200px)",
    background: "transparent",
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: "transparent",
        border: "none",
        padding: 0,
      },
    };
  };

  const dayPropGetter = (date) => {
    const today = new Date();
    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

    return {
      style: {
        backgroundColor: isToday ? "rgba(168, 85, 247, 0.1)" : "transparent",
        border: isToday ? "1px solid rgba(168, 85, 247, 0.3)" : "none",
      },
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Calendar View</h1>
          <p className="text-cyan-300/70">
            View your tasks organized by due dates
          </p>
        </div>

        <div className="glass-card p-6">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={calendarStyle}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
            components={{
              event: TaskEvent,
            }}
            views={["month", "week", "day"]}
            view={view}
            onView={setView}
            onSelectEvent={handleEventClick}
            popup
            selectable
            className="custom-calendar"
          />
        </div>

        {/* Task Details Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-white/60 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {selectedTask.description && (
                <p className="text-cyan-300/80 mb-4">{selectedTask.description}</p>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-300/60">Priority:</span>
                  <span className={`text-sm font-medium ${
                    selectedTask.priority?.toLowerCase() === "high" ? "text-red-400" :
                    selectedTask.priority?.toLowerCase() === "medium" ? "text-amber-400" :
                    selectedTask.priority?.toLowerCase() === "low" ? "text-emerald-400" :
                    "text-purple-400"
                  }`}>
                    {selectedTask.priority}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-300/60">Category:</span>
                  <span className="text-sm text-white">
                    {selectedTask.category === "Work" && "💼"}
                    {selectedTask.category === "Personal" && "👤"}
                    {selectedTask.category === "Health" && "🏥"}
                    {selectedTask.category === "Shopping" && "🛒"}
                    {selectedTask.category === "Other" && "📋"}
                    {" " + selectedTask.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-300/60">Status:</span>
                  <span className={`text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                    {getStatusText(selectedTask.status)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-cyan-300/60">Due Date:</span>
                  <span className="text-sm text-pink-400">
                    {formatDate(selectedTask.dueDate)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleTaskToggle(selectedTask)}
                  className={`flex-1 glass-button ${
                    selectedTask.completed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {selectedTask.completed ? "✅ Mark Incomplete" : "✔️ Mark Complete"}
                </button>
                <button
                  onClick={handleEditTask}
                  className="flex-1 glass-button-outline"
                >
                  ✏️ Edit Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 glass-card p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/80 rounded border border-red-400"></div>
              <span className="text-sm text-white">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500/80 rounded border border-amber-400"></div>
              <span className="text-sm text-white">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500/80 rounded border border-emerald-400"></div>
              <span className="text-sm text-white">Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500/80 rounded border border-purple-400"></div>
              <span className="text-sm text-white">Default Priority</span>
            </div>
          </div>
        </div>

        {/* Tasks without due dates */}
        {(() => {
          const tasksWithoutDates = tasks.filter(task => !task.dueDate);
          if (tasksWithoutDates.length === 0) return null;

          return (
            <div className="mt-6 glass-card p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                📝 Tasks without due dates ({tasksWithoutDates.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tasksWithoutDates.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 glass rounded-lg">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => dispatch(toggleTaskFirestore(task))}
                      className="w-4 h-4 accent-purple-500 cursor-pointer"
                    />
                    <span className={`flex-1 text-sm ${
                      task.completed ? "line-through text-cyan-300/40" : "text-white"
                    }`}>
                      {task.title}
                    </span>
                    <span className="text-xs text-cyan-300/60">
                      {task.category === "Work" && "💼"}
                      {task.category === "Personal" && "👤"}
                      {task.category === "Health" && "🏥"}
                      {task.category === "Shopping" && "🛒"}
                      {task.category === "Other" && "📋"}
                    </span>
                  </div>
                ))}
                {tasksWithoutDates.length > 5 && (
                  <p className="text-xs text-cyan-300/60 text-center mt-2">
                    ... and {tasksWithoutDates.length - 5} more tasks
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}