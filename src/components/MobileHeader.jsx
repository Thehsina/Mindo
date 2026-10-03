import { Link } from "react-router-dom";
import BrandWordmark from "./BrandWordmark";
import NotificationCenter from "./NotificationCenter";
import { UserCircle2 } from "lucide-react";

export default function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md dark:border-slate-800/60 dark:bg-[#121214]/90 shrink-0">
      <Link to="/dashboard" className="flex items-center">
        <BrandWordmark compact />
      </Link>
      <div className="flex items-center gap-2">
        <NotificationCenter />
        <Link
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition"
          aria-label="Profile"
        >
          <UserCircle2 className="h-6 w-6" />
        </Link>
      </div>
    </header>
  );
}
