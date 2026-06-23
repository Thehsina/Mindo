// src/components/TaskInput.jsx
export default function TaskInput({ draft, setDraft, onSave, onInfo }) {
  return (
    <div className="task-card flex items-start gap-3">
      <input type="checkbox" disabled className="accent-cyan-500 mt-1 h-5 w-5" />
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <input
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Task title"
            className="glass-input text-lg font-semibold w-full"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInfo();
            }}
            className="small-button px-2 py-1 text-xs bg-slate-700/30 rounded"
            title="Task details"
          >
            i
          </button>
        </div>
        <textarea
          value={draft.note}
          onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))}
          placeholder="Add note..."
          className="glass-input mt-2 h-20 w-full resize-none"
        />
        <div className="mt-3 flex gap-2">
          <button onClick={onSave} className="glass-button px-4 py-2">Add</button>
        </div>
      </div>
    </div>
  );
}