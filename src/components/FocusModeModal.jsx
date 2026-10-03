import { useEffect, useMemo, useState } from "react";
import { X, Play, Pause, RotateCcw, CheckCircle2, Timer, Sparkles } from "lucide-react";

const DEFAULT_DURATIONS = [15, 25, 50];

const formatTime = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function FocusModeModal({ task, onClose, subtasks = [], onCompleteTask }) {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [remainingMs, setRemainingMs] = useState(25 * 60 * 1000);
  const [isRunning, setIsRunning] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [sessionFinished, setSessionFinished] = useState(false);

  useEffect(() => {
    const baseMs = selectedMinutes * 60 * 1000;
    setRemainingMs(baseMs);
    setIsRunning(false);
    setDeadline(null);
    setSessionFinished(false);
  }, [selectedMinutes]);

  useEffect(() => {
    if (!isRunning || !deadline) return undefined;

    const tick = setInterval(() => {
      const nextRemaining = Math.max(0, deadline - Date.now());
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        setIsRunning(false);
        setDeadline(null);
        setSessionFinished(true);
      }
    }, 250);

    return () => clearInterval(tick);
  }, [isRunning, deadline]);

  const progress = useMemo(() => {
    const total = selectedMinutes * 60 * 1000;
    return total === 0 ? 0 : ((total - remainingMs) / total) * 100;
  }, [remainingMs, selectedMinutes]);

  const handleStart = () => {
    if (isRunning) return;
    const nextDeadline = Date.now() + remainingMs;
    setDeadline(nextDeadline);
    setIsRunning(true);
    setSessionFinished(false);
  };

  const handlePause = () => {
    if (!isRunning) return;
    const nextRemaining = Math.max(0, (deadline ?? Date.now()) - Date.now());
    setRemainingMs(nextRemaining);
    setIsRunning(false);
    setDeadline(null);
  };

  const handleResume = () => {
    if (!remainingMs || isRunning) return;
    setDeadline(Date.now() + remainingMs);
    setIsRunning(true);
    setSessionFinished(false);
  };

  const handleReset = () => {
    const baseMs = selectedMinutes * 60 * 1000;
    setRemainingMs(baseMs);
    setIsRunning(false);
    setDeadline(null);
    setSessionFinished(false);
  };

  const checkedCount = subtasks.filter((subtask) => subtask.completed).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 backdrop-blur-sm">
      <div className="w-[calc(100vw-24px)] sm:w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#121214]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Focus mode</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{task?.title || "Task focus"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#1a1a1e]">
            <div className="mb-3 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-2 font-medium">
                <Timer className="h-4 w-4" />
                Timer
              </span>
              <span>{checkedCount}/{subtasks.length || 0} steps done</span>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {DEFAULT_DURATIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setSelectedMinutes(minutes)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    selectedMinutes === minutes
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-white px-4 py-5 text-center shadow-inner dark:bg-[#111214]">
              <div className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
                {formatTime(remainingMs)}
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            </div>
          </div>

          {task?.note && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-slate-300">
              {task.note}
            </div>
          )}

          {sessionFinished && (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Session complete. Great work.</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isRunning ? (
              remainingMs >= selectedMinutes * 60 * 1000 && !sessionFinished ? (
                <button
                  type="button"
                  onClick={handleStart}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Play className="h-4 w-4" /> Start
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <Play className="h-4 w-4" /> Resume
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Pause className="h-4 w-4" /> Pause
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Exit
            </button>
          </div>

          {onCompleteTask && (
            <button
              type="button"
              onClick={onCompleteTask}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark task as complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
