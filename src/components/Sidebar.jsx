import { Link, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  Calendar as CalendarIcon,
  ShoppingCart,
  Utensils,
  Receipt,
  FileText,
  Settings,
  UserCircle2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase";
import BrandWordmark from "./BrandWordmark";
import { getAvatarUrl } from "../utils/avatars";

const navLinks = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/habits", label: "Habits", icon: Flame },
  { path: "/calendar", label: "Calendar", icon: CalendarIcon },
  { path: "/grocery", label: "Grocery", icon: ShoppingCart },
  { path: "/meal-planner", label: "Meal Planner", icon: Utensils },
  { path: "/expenses", label: "Expenses", icon: Receipt },
  { path: "/notes", label: "Notes", icon: FileText },
];

export default function Sidebar() {
  const location = useLocation();
  const profile = useSelector((state) => state.profile || {});
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      if (!isSupabaseConfigured) {
        const local = localStorage.getItem("tm.local_user");
        if (!active) return;
        setUser(local ? JSON.parse(local) : { id: "local-user", email: "local@example.com", user_metadata: { display_name: "Local User" } });
        return;
      }

      const currentUser = await getCurrentUser();
      if (active) setUser(currentUser);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";

  return (
    <aside className="hidden lg:flex flex-col border-b border-slate-200/80 bg-white/75 p-3 backdrop-blur-xl dark:border-slate-800/60 dark:bg-[#121214]/80 lg:h-full lg:w-64 lg:border-b-0 lg:border-r lg:p-4 shrink-0 no-scrollbar overflow-hidden">
      <div className="mb-4 px-1 py-1 lg:mb-5 shrink-0">
        <Link to="/dashboard" className="leading-none block hover:opacity-90 transition-opacity" title="Minddo Home">
          <BrandWordmark compact showTagline className="leading-none" />
        </Link>
      </div>

      <nav className="grid grid-cols-2 gap-2 overflow-y-auto no-scrollbar pr-1 sm:grid-cols-3 lg:grid-cols-1 lg:gap-1 lg:space-y-1 lg:pr-1 flex-1">
        {navLinks.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={`sidebar-item ${isActive ? "active" : ""}`}
            >
              <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
              <span className="text-xs lg:text-sm">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User & Settings Dedicated Area */}
      <div className="mt-auto border-t border-slate-200 pt-3 dark:border-slate-800 lg:pt-4 space-y-1">
        <NavLink
          to="/settings"
          className={`sidebar-item ${location.pathname === "/settings" ? "active" : ""}`}
        >
          <Settings className="h-4 w-4 lg:h-5 lg:w-5" />
          <span className="text-xs lg:text-sm">Settings</span>
        </NavLink>
        <NavLink
          to="/profile"
          className={`sidebar-item ${location.pathname === "/profile" ? "active" : ""}`}
        >
          <img
            src={getAvatarUrl(profile.avatar_url, profile.full_name || displayName)}
            alt="Profile avatar"
            className="h-5 w-5 sm:h-5.5 sm:w-5.5 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs lg:text-sm truncate">Profile</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{profile.full_name || displayName}</span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
