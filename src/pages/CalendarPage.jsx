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
  const getPriorityStyle = (priority) => {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "bg-rose-500 text-white border-rose-600";
    if (p === "medium") return "bg-amber-500 text-white border-amber-600";
    if (p === "low") return "bg-emerald-500 text-white border-emerald-600";
    return "bg-indigo-500 text-white border-indigo-600";
  };

  return (
    <div className={`p-1 rounded text-xs border shadow-xs h-full ${getPriorityStyle(event.priority)}`}>
      <div className="flex items-center gap-1 font-medium truncate">
        {event.title}
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
    height: "500px",
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
    <div className="animate-fade-in-up flex flex-col h-full min-h-0 space-y-4 overflow-x-hidden max-w-full">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 leading-none">
          <CalendarDays className="w-7 h-7 text-indigo-500" />
          Calendar
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">View your tasks organized by due dates.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 min-h-0 overflow-y-auto pr-0 sm:pr-1">
        <div className="xl:col-span-3 min-h-[500px]">
          <div className="bento-card !p-3 sm:!p-5 shadow-xs overflow-x-auto no-scrollbar">
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
            />
          </div>
        </div>

        <div className="xl:col-span-1 space-y-4">
          {/* Legend */}
          <div className="bento-card !p-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Legend</h3>
            <div className="grid grid-cols-2 xl:grid-cols-1 gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 bg-rose-500 rounded border border-rose-600 shrink-0"></div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">High Priority</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 bg-amber-500 rounded border border-amber-600 shrink-0"></div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Medium Priority</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 bg-emerald-500 rounded border border-emerald-600 shrink-0"></div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Low Priority</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 bg-indigo-500 rounded border border-indigo-600 shrink-0"></div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Priority</span>
              </div>
            </div>
          </div>

          {/* Tasks without due dates */}
          {(() => {
            const tasksWithoutDates = tasks.filter(task => !task.dueDate);
            if (tasksWithoutDates.length === 0) return null;

            return (
              <div className="bento-card !p-4">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                  No Due Date
                  <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs font-bold">
                    {tasksWithoutDates.length}
                  </span>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tasksWithoutDates.slice(0, 5).map(task => (
                    <div key={task.id} className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => dispatch(toggleTaskFirestore(task))}
                        className="w-4 h-4 accent-indigo-600 cursor-pointer shrink-0 mt-0.5 rounded"
                      />
                      <span className={`text-xs font-medium truncate ${
                        task.completed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {task.title}
                      </span>
                    </div>
                  ))}
                  {tasksWithoutDates.length > 5 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800/60 text-center">
                      +{tasksWithoutDates.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
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