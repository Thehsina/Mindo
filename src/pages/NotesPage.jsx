import Notes from "../components/Notes";
import { FileText } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="animate-fade-in-up flex flex-col h-full min-h-0 space-y-3 sm:space-y-4 overflow-hidden max-w-full">
      {/* Header Area */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5 leading-none">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-500" />
            Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Capture your thoughts and ideas.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col bento-card !p-3 sm:!p-4 overflow-hidden max-w-full">
        <Notes />
      </div>
    </div>
  );
}