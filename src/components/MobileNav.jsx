import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar as CalendarIcon,
  Flame,
  ShoppingCart,
  Utensils,
  Receipt,
  FileText,
} from "lucide-react";

const navLinks = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/calendar", label: "Calendar", icon: CalendarIcon },
  { path: "/habits", label: "Habits", icon: Flame },
  { path: "/grocery", label: "Grocery", icon: ShoppingCart },
  { path: "/meal-planner", label: "Meals", icon: Utensils },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/notes", label: "Notes", icon: FileText },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/80 bg-white dark:border-slate-800/80 dark:bg-[#121214] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "max(0.4rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="flex items-center gap-1 overflow-x-auto whitespace-nowrap px-2 py-1.5 no-scrollbar"
        style={{
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {navLinks.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[46px] rounded-xl px-2.5 py-1 text-center transition shrink-0 ${
                isActive
                  ? "text-indigo-600 font-bold bg-indigo-50/80 dark:text-indigo-400 dark:bg-indigo-500/15"
                  : "text-slate-500 font-medium hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
              style={{ flex: "0 0 auto" }}
            >
              <Icon className={`h-5 w-5 shrink-0 flex-shrink-0 transition-transform ${isActive ? "scale-105" : ""}`} />
              <span className="text-[10px] leading-tight mt-0.5 tracking-tight">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
