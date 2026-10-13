import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import BrandWordmark from "./BrandWordmark";
import NotificationCenter from "./NotificationCenter";
import { Settings } from "lucide-react";
import { getAvatarUrl } from "../utils/avatars";

export default function MobileHeader() {
  const location = useLocation();
  const profile = useSelector((state) => state.profile || {});

  // Helper for human-friendly desktop header titles
  const getPageTitle = (path) => {
    const clean = path.replace(/^\//, "");
    if (!clean || clean === "dashboard") return "Dashboard";
    if (clean === "meal-planner") return "Meal Planner";
    if (clean === "brain-dump") return "Brain Dump";
    if (clean === "command-center" || clean === "sam") return "Sam AI Assistant";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };

  const avatarSrc = getAvatarUrl(profile.avatar_url, profile.full_name || "User");

  return (
    <div className="w-full shrink-0 pt-1.5 sm:pt-2 pb-1 px-3 sm:px-4 flex justify-center sticky top-0 z-40 pointer-events-none">
      <header className="pointer-events-auto w-full max-w-5xl flex items-center justify-between border border-slate-200/80 bg-white/95 px-3.5 sm:px-4 py-2 sm:py-2.5 backdrop-blur-md dark:border-slate-800/60 dark:bg-[#121214]/95 rounded-2xl shadow-2xs min-h-[48px] sm:min-h-[52px]">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Logo Brand */}
          <div className="md:hidden flex items-center shrink-0">
            <Link to="/dashboard" className="flex items-center" title="Minddo Home">
              <BrandWordmark compact imgClassName="h-7 sm:h-7.5 w-auto object-contain" />
            </Link>
          </div>
          {/* Web/Desktop Title Display */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 tracking-tight leading-none truncate">
              {getPageTitle(location.pathname)}
            </h2>
          </div>
        </div>

        {/* Header Actions: Reminder, Settings, and Circular Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <NotificationCenter />

          <Link
            to="/settings"
            className="flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 shadow-2xs transition hover:bg-slate-100 hover:text-indigo-600 dark:border-slate-700 dark:bg-[#17181c]/80 dark:text-slate-100 dark:hover:bg-[#1d1f24] dark:hover:text-indigo-400 shrink-0 cursor-pointer"
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </Link>

          {/* Circular Compact Profile Avatar */}
          <Link
            to="/profile"
            className="relative flex h-8.5 w-8.5 sm:h-9 sm:w-9 items-center justify-center rounded-full overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 shadow-2xs transition hover:ring-2 hover:ring-indigo-500/40 hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
            aria-label="Profile"
            title={profile.full_name || "Profile"}
          >
            <img
              src={avatarSrc}
              alt={profile.full_name || "Profile"}
              className="h-full w-full object-cover rounded-full select-none"
            />
          </Link>
        </div>
      </header>
    </div>
  );
}
