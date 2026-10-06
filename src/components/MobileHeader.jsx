import { Link } from "react-router-dom";
import BrandWordmark from "./BrandWordmark";
import NotificationCenter from "./NotificationCenter";
import { UserCircle2, Sparkles } from "lucide-react";

export default function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-3.5 py-2.5 backdrop-blur-md dark:border-slate-800/60 dark:bg-[#121214]/90 shrink-0">
      <Link to="/dashboard" className="flex items-center">
        <BrandWordmark compact />
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          to="/command-center"
          className="flex h-8 sm:h-9 items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer"
          aria-label="Open Command Center"
          title="Command Center"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="hidden xs:inline">Command Center</span>
        </Link>
        <NotificationCenter />
        <Link
          to="/profile"
          className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition"
          aria-label="Profile"
        >
          <UserCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
        </Link>
      </div>
    </header>
  );
}
