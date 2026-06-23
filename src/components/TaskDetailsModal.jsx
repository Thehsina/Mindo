import React from "react";

export const priorityMeta = {
  None: { mark: "" },
  Low: { mark: "!" },
  Medium: { mark: "!!" },
  High: { mark: "!!!" }
};

export default function TaskDetailsModal({ task, errors, onChange, onClose, onSave }) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{task.id === 'new' ? 'New Task' : 'Edit Task'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={task.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className={`w-full rounded-xl bg-slate-800 border p-3 text-white ${errors.title ? 'border-red-500' : 'border-slate-600 focus:border-cyan-500'} outline-none transition`}
              placeholder="Task title"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Note</label>
            <textarea
              value={task.note}
              onChange={(e) => onChange({ note: e.target.value })}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 p-3 text-white focus:border-cyan-500 outline-none transition h-24 resize-none"
              placeholder="Add details..."
            />
          </div>

          {/* Date and Time */}
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.dateEnabled}
                  onChange={(e) => onChange({ dateEnabled: e.target.checked })}
                  className="accent-cyan-500 h-4 w-4 rounded"
                />
                Due Date
              </label>
              {task.dateEnabled && (
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={(e) => onChange({ dueDate: e.target.value })}
                  className="bg-slate-700 text-white p-2 rounded-lg text-sm border border-slate-600 focus:border-cyan-500 outline-none"
                />
              )}
            </div>
            {errors.dueDate && <p className="text-red-400 text-xs">{errors.dueDate}</p>}

            {task.dateEnabled && (
              <div className="flex items-center justify-between mt-3">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={task.timeEnabled}
                    onChange={(e) => onChange({ timeEnabled: e.target.checked })}
                    className="accent-cyan-500 h-4 w-4 rounded"
                  />
                  Time
                </label>
                {task.timeEnabled && (
                  <input
                    type="time"
                    value={task.dueTime}
                    onChange={(e) => onChange({ dueTime: e.target.value })}
                    className="bg-slate-700 text-white p-2 rounded-lg text-sm border border-slate-600 focus:border-cyan-500 outline-none"
                  />
                )}
              </div>
            )}
            {errors.dueTime && <p className="text-red-400 text-xs">{errors.dueTime}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
            <div className="flex gap-2">
              {['None', 'Low', 'Medium', 'High'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ priority: p })}
                  className={`flex-1 py-2 text-sm rounded-xl border transition ${task.priority === p ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                >
                  {p} {priorityMeta[p].mark}
                </button>
              ))}
            </div>
          </div>

          {/* List/Category */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">List</label>
            <select
              value={task.list}
              onChange={(e) => onChange({ list: e.target.value })}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 p-3 text-white focus:border-cyan-500 outline-none transition"
            >
              <option value="Reminders">Reminders</option>
              <option value="Work">Work</option>
              <option value="Personal">Personal</option>
            </select>
          </div>
          
          {/* Location */}
          <div>
             <label className="block text-sm font-medium text-slate-300 mb-1">Location Reminder</label>
             <select
              value={task.locationType}
              onChange={(e) => onChange({ locationType: e.target.value, locationName: e.target.value === 'none' ? '' : task.locationName })}
              className="w-full rounded-xl bg-slate-800 border border-slate-600 p-3 text-white focus:border-cyan-500 outline-none transition mb-2"
            >
              <option value="none">None</option>
              <option value="current">Current Location</option>
              <option value="gettingIn">Getting In</option>
              <option value="gettingOut">Getting Out</option>
              <option value="custom">Custom...</option>
            </select>
            {task.locationType === 'custom' && (
              <input
                type="text"
                value={task.locationName}
                onChange={(e) => onChange({ locationName: e.target.value })}
                className={`w-full rounded-xl bg-slate-800 border p-3 text-white ${errors.locationName ? 'border-red-500' : 'border-slate-600 focus:border-cyan-500'} outline-none transition`}
                placeholder="Enter location"
              />
            )}
             {errors.locationName && <p className="text-red-400 text-xs mt-1">{errors.locationName}</p>}
          </div>

        </div>

        {/* Action buttons */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition shadow-lg shadow-cyan-500/20"
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}
