import Notes from "../components/Notes";
import { FileText } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="animate-fade-in-up flex flex-col h-full min-h-0 space-y-2.5 sm:space-y-3 overflow-hidden max-w-full">
      {/* 1. COMPACT UNIFIED TOP HEADER */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Notes
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate">
              Capture your thoughts and ideas.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col bento-card !p-3 sm:!p-4 overflow-hidden max-w-full">
        <Notes />
      </div>
    </div>
  );
}