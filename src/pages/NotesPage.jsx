import Notes from "../components/Notes";
import { FileText } from "lucide-react";

export default function NotesPage() {
  return (
    <div className="animate-fade-in-up flex flex-col h-[calc(100vh-4rem)]">
      {/* Header Area */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-500" />
            Notes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Capture your thoughts and ideas.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bento-card flex-1 overflow-y-auto flex flex-col">
          <Notes />
        </div>
      </div>
    </div>
  );
}