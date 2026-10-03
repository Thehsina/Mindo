import React from "react";
import { X, Calendar, Clock, MapPin, ListTodo, AlertCircle, Plus, CheckCircle2, Play, Trash2 } from "lucide-react";

export const priorityMeta = {
  None: { mark: "" },
  Low: { mark: "!" },
  Medium: { mark: "!!" },
  High: { mark: "!!!" }
};

export default function TaskDetailsModal({
  task,
  errors,
  subtasks = [],
  subtaskDraft = "",
  onChange,
  onClose,
  onSave,
  onSubtaskDraftChange,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenFocusMode,
}) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in-up">
      <div className="w-[calc(100vw-24px)] sm:w-full max-w-md bg-white dark:bg-[#121214] border border-slate-200 dark:border-slate-800/60 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] shrink-0">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
            {task.id === 'new' ? 'New Task' : 'Edit Task'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {errors.form && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {errors.form}
            </div>
          )}
          {/* Title */}
          <div>
            <input
              type="text"
              value={task.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className={`w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 font-bold text-base sm:text-lg mb-1 ${errors.title ? 'border-b-rose-500 rounded-none border-b-2' : ''}`}
              placeholder="Task title"
              autoFocus
            />
            {errors.title && <p className="text-rose-500 text-xs mt-1 font-medium">{errors.title}</p>}
          </div>

          {/* Note */}
          <div>
            <textarea
              value={task.note}
              onChange={(e) => onChange({ note: e.target.value })}
              className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow h-20 sm:h-24 resize-none text-xs sm:text-sm font-medium"
              placeholder="Add details..."
            />
          </div>

          {/* Subtasks */}
          {task.id !== "new" && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Subtasks</h3>
                  {subtasks.length > 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {subtasks.filter((subtask) => subtask.completed).length} of {subtasks.length} completed
                    </p>
                  )}
                </div>
                {onOpenFocusMode && (
                  <button
                    type="button"
                    onClick={onOpenFocusMode}
                    className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Focus
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {subtasks.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No subtasks yet. Add a small step.</p>
                ) : (
                  subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-[#141417]">
                      <input
                        type="checkbox"
                        checked={Boolean(subtask.completed)}
                        onChange={(event) => onToggleSubtask && onToggleSubtask(subtask.id, event.target.checked)}
                        className="h-4 w-4 accent-indigo-600 rounded cursor-pointer"
                      />
                      <span className={`flex-1 text-xs sm:text-sm font-medium ${subtask.completed ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-200"}`}>
                        {subtask.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteSubtask && onDeleteSubtask(subtask.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Delete subtask"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  value={subtaskDraft}
                  onChange={(event) => onSubtaskDraftChange && onSubtaskDraftChange(event.target.value)}
                  placeholder="Add a small step"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-100 font-medium"
                />
                <button
                  type="button"
                  onClick={onAddSubtask}
                  className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Date and Time */}
          <div className="bg-slate-50 dark:bg-[#1a1a1e] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.dateEnabled}
                  onChange={(e) => onChange({ dateEnabled: e.target.checked })}
                  className="accent-indigo-600 h-4 w-4 rounded cursor-pointer"
                />
                <Calendar className="w-4 h-4 text-slate-400" /> Due Date
              </label>
              {task.dateEnabled && (
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => onChange({ dueDate: e.target.value })}
                  className="bg-white dark:bg-[#121214] text-slate-700 dark:text-slate-300 p-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              )}
            </div>
            {errors.dueDate && <p className="text-rose-500 text-xs font-medium">{errors.dueDate}</p>}

            {task.dateEnabled && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={task.timeEnabled}
                    onChange={(e) => onChange({ timeEnabled: e.target.checked })}
                    className="accent-indigo-600 h-4 w-4 rounded cursor-pointer"
                  />
                  <Clock className="w-4 h-4 text-slate-400" /> Time
                </label>
                {task.timeEnabled && (
                  <input
                    type="time"
                    value={task.dueTime}
                    onChange={(e) => onChange({ dueTime: e.target.value })}
                    className="bg-white dark:bg-[#121214] text-slate-700 dark:text-slate-300 p-2 rounded-xl text-xs sm:text-sm border border-slate-200 dark:border-slate-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                )}
              </div>
            )}
            {errors.dueTime && <p className="text-rose-500 text-xs font-medium">{errors.dueTime}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400" /> Priority
            </label>
            <div className="flex gap-1.5 bg-slate-50 dark:bg-[#1a1a1e] p-1 rounded-xl border border-slate-200 dark:border-slate-800/60">
              {['None', 'Low', 'Medium', 'High'].map((p) => {
                const isActive = task.priority === p;
                let activeClass = 'bg-white dark:bg-[#2a2a2e] shadow-xs text-slate-900 dark:text-white';
                if (isActive) {
                  if (p === 'High') activeClass = 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow-xs';
                  if (p === 'Medium') activeClass = 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 shadow-xs';
                  if (p === 'Low') activeClass = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-xs';
                }

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ priority: p })}
                    className={`flex-1 min-h-[38px] py-1.5 px-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      isActive 
                        ? activeClass 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {p} {priorityMeta[p].mark}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* List/Category */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-slate-400" /> List
              </label>
              <select
                value={task.list}
                onChange={(e) => onChange({ list: e.target.value })}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 p-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none text-xs sm:text-sm font-semibold"
              >
                <option value="Reminders">Reminders</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> Repeat
              </label>
              <select
                value={task.repeat || "Never"}
                onChange={(e) => onChange({ repeat: e.target.value })}
                className="w-full rounded-xl bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 p-2.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none text-xs sm:text-sm font-semibold"
              >
                <option value="Never">Never</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

        </div>

        {/* Action buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-[#1a1a1e] flex flex-col sm:flex-row gap-2 sm:justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}
