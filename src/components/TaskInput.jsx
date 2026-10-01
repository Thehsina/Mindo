import { Info } from "lucide-react";

export default function TaskInput({ draft, setDraft, onSave, onInfo }) {
  return (
    <div className="bento-card p-4">
      <div className="flex items-start gap-3">
        <input type="checkbox" disabled className="accent-indigo-600 mt-1.5 h-5 w-5 rounded cursor-not-allowed opacity-50" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Task title"
              className="w-full bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 font-semibold text-lg"
              autoFocus
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInfo();
              }}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors shrink-0"
              title="Task details"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <textarea
            value={draft.note}
            onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Add note..."
            className="w-full mt-2 bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none h-20 text-sm transition-shadow"
          />
          <div className="mt-3 flex justify-end">
            <button 
              onClick={onSave} 
              disabled={!draft.title.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}