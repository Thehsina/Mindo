import { AlertTriangle } from "lucide-react";

export default function Reminder({task}){
  const today = new Date();
  const due = new Date(task.dueDate);

  if(due < today && !task.completed){
    return(
      <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 mb-3 animate-fade-in-up">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">
          Task overdue: <span className="font-bold">{task.title}</span>
        </span>
      </div>
    );
  }

  return null;
}