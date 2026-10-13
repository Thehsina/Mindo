import { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toggleTaskFirestore } from "../redux/tasksSlice";
import { CalendarDays, Edit2, CheckCircle2, Circle, X } from "lucide-react";
import { formatDue } from "../utils/dateUtils";
import "react-big-calendar/lib/css/react-big-calendar.css";

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

function TaskEvent({ event }) {
  const getPriorityColor = (priority, completed) => {
    if (completed) return "bg-slate-400 dark:bg-slate-500";
    const p = (priority || "").toLowerCase();
    if (p === "high") return "bg-rose-500";
    if (p === "medium") return "bg-amber-500";
    if (p === "low") return "bg-emerald-500";
    return "bg-indigo-500";
  };

  const getPriorityStyle = (priority, completed) => {
    if (completed) {
      return "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:border-slate-700/60 line-through";
    }
    const p = (priority || "").toLowerCase();
    if (p === "high") return "bg-rose-500 text-white border-rose-600 shadow-2xs";
    if (p === "medium") return "bg-amber-500 text-white border-amber-600 shadow-2xs";
    if (p === "low") return "bg-emerald-500 text-white border-emerald-600 shadow-2xs";
    return "bg-indigo-600 text-white border-indigo-700 shadow-2xs";
  };

  return (
    <div className="w-full max-w-full overflow-hidden min-w-0">
      {/* Mobile view (< sm): small dot badge */}
      <div className="flex sm:hidden items-center justify-center py-0.5">
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${getPriorityColor(
            event.priority,
            event.completed
          )}`}
          title={`${event.title} (${event.priority || "Normal"} priority)`}
        />
      </div>
      {/* Tablet/Desktop view (>= sm): full pill */}
      <div
        className={`hidden sm:flex px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-[1.02] cursor-pointer truncate ${getPriorityStyle(
          event.priority,
          event.completed
        )}`}
        title={`${event.title} (${event.priority || "Normal"} priority)`}
      >
        <span className="truncate">{event.title}</span>
      </div>
    </div>
  );
}

function CalendarToolbar({ label, onNavigate, onView, view }) {
  return (
    <div className="flex items-center justify-between gap-1 sm:gap-4 mb-3 sm:mb-4 w-full flex-nowrap">
      {/* Left side: Navigation buttons ("Today", "Back", "Next") */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate("TODAY")}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222226] transition-colors shadow-2xs cursor-pointer"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onNavigate("PREV")}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222226] transition-colors shadow-2xs cursor-pointer"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => onNavigate("NEXT")}
          className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222226] transition-colors shadow-2xs cursor-pointer"
        >
          Next
        </button>
      </div>

      {/* Center: Current Month and Year title (e.g., "October 2026") */}
      <div className="flex items-center justify-center min-w-0 px-1 sm:px-2 text-center">
        <h2 className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white truncate">
          {label}
        </h2>
      </div>

      {/* Right side: View selector buttons ("Month", "Week", "Day") */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {[
          { key: "month", label: "Month" },
          { key: "week", label: "Week" },
          { key: "day", label: "Day" },
        ].map(({ key, label: viewLabel }) => {
          const isActive = view === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onView(key)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1a1e] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222226] shadow-2xs"
              }`}
            >
              {viewLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const tasks = useSelector((state) => state.tasks);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [view, setView] = useState("month");
  const [selectedTask, setSelectedTask] = useState(null);

  const events = tasks
    .filter(task => task.dueDate)
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
      resource: task,
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

  const formatDate = (timestamp, hasTime) => {
    if (!timestamp) return "";
    return formatDue(timestamp, hasTime);
  };

  const calendarStyle = {
    height: "100%",
    width: "100%",
    background: "transparent",
  };

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: "transparent",
        border: "none",
        padding: "2px",
      },
    };
  };

  const dayPropGetter = (date) => {
    const today = new Date();
    const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

    return {
      style: {
        backgroundColor: isToday ? "rgba(99, 102, 241, 0.05)" : "transparent",
      },
      className: isToday ? "border-indigo-200 dark:border-indigo-900/50" : "",
    };
  };

  return (
    <div className="animate-fade-in-up flex flex-col h-full min-h-0 space-y-2 sm:space-y-3 overflow-hidden max-w-full">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 leading-none">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            Calendar
          </h1>
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-medium">
            • View your tasks organized by due dates
          </span>
        </div>
      </div>

      {/* Main Calendar Card - fills available space with integrated Legend, zero scrollbar */}
      <div className="bento-card !p-2.5 sm:!p-4 shadow-xs w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 w-full flex flex-col">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={calendarStyle}
            eventPropGetter={eventStyleGetter}
            dayPropGetter={dayPropGetter}
            components={{
              toolbar: CalendarToolbar,
              event: TaskEvent,
            }}
            views={["month", "week", "day"]}
            view={view}
            onView={setView}
            onSelectEvent={handleEventClick}
            popup
            selectable
          />
        </div>

        {/* Integrated Legend Footer - directly visible without scrolling */}
        <div className="shrink-0 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Legend
          </span>
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap text-[11px] sm:text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">High Priority</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Medium Priority</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Low Priority</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">Default Priority</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal Overlay */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-slate-800/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-3 right-3 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white pr-8 mb-3">{selectedTask.title}</h3>

            {selectedTask.description && (
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-4 bg-slate-50 dark:bg-[#1a1a1e] p-3 rounded-xl border border-slate-100 dark:border-slate-800/60">
                {selectedTask.description}
              </p>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Priority</span>
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  selectedTask.priority?.toLowerCase() === "high" ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400" :
                  selectedTask.priority?.toLowerCase() === "medium" ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                  selectedTask.priority?.toLowerCase() === "low" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" :
                  "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400"
                }`}>
                  {selectedTask.priority || "None"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-[#1a1a1e] px-2 py-0.5 rounded-md">
                  {selectedTask.category || "General"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</span>
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                  selectedTask.completed ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"
                }`}>
                  {selectedTask.completed ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  {selectedTask.completed ? "Completed" : "Active"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Due Date</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {formatDate(selectedTask.dueDate)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleTaskToggle(selectedTask)}
                className={`flex-1 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-2 text-xs font-bold rounded-xl px-4 py-2.5 transition-colors cursor-pointer ${
                  selectedTask.completed 
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#1a1a1e] dark:text-slate-300 dark:hover:bg-[#222226]" 
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                }`}
              >
                {selectedTask.completed ? "Mark Incomplete" : "Mark Complete"}
              </button>
              <button
                onClick={handleEditTask}
                className="btn-secondary !py-2.5 text-xs font-bold min-h-[44px] sm:min-h-0"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}