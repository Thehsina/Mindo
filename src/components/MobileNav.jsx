import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar as CalendarIcon,
  FileText,
  ShoppingCart,
  MoreHorizontal,
  Settings,
  UserCircle2,
  Sparkles,
  X,
} from "lucide-react";

const mainNavLinks = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/calendar", label: "Calendar", icon: CalendarIcon },
  { path: "/notes", label: "Notes", icon: FileText },
  { path: "/grocery", label: "Grocery", icon: ShoppingCart },
];

const secondaryNavLinks = [
  { path: "/command-center", label: "Command Center", icon: Sparkles },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/profile", label: "Profile", icon: UserCircle2 },
];

export default function MobileNav() {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isSecondaryActive = secondaryNavLinks.some((link) => location.pathname === link.path);

  return (
    <>
      {/* Fixed Bottom Nav Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-slate-200/80 bg-white/95 px-1 py-1.5 backdrop-blur-lg dark:border-slate-800/80 dark:bg-[#121214]/95 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-lg">
        {mainNavLinks.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              onClick={() => setShowMoreMenu(false)}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition ${
                isActive
                  ? "text-indigo-600 font-bold dark:text-indigo-400"
                  : "text-slate-500 font-medium hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] leading-tight">{label}</span>
            </NavLink>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => setShowMoreMenu((prev) => !prev)}
          className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-center transition cursor-pointer ${
            showMoreMenu || isSecondaryActive
              ? "text-indigo-600 font-bold dark:text-indigo-400"
              : "text-slate-500 font-medium hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
          aria-label="More options"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] leading-tight">More</span>
        </button>
      </nav>

      {/* Slide-Up Popover Sheet for "More" Menu */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">More Options</span>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {secondaryNavLinks.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname === path;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-3 text-center transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 font-bold"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-[#1a1a1e] dark:text-slate-300 font-medium"
                    }`}
                  >
                    <Icon className="h-6 w-6 text-indigo-500" />
                    <span className="text-xs">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
