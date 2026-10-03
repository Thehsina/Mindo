import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { LayoutDashboard, CheckSquare, Calendar as CalendarIcon, FileText, ShoppingCart, Settings, UserCircle2 } from "lucide-react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase";
import BrandWordmark from "./BrandWordmark";

const navLinks = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tasks", label: "Tasks", icon: CheckSquare },
  { path: "/calendar", label: "Calendar", icon: CalendarIcon },
  { path: "/notes", label: "Notes", icon: FileText },
  { path: "/grocery", label: "Grocery", icon: ShoppingCart },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
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
    <aside className="hidden md:flex flex-col border-b border-slate-200/80 bg-white/75 p-3 backdrop-blur-xl dark:border-slate-800/60 dark:bg-[#121214]/80 md:h-full md:w-64 md:border-b-0 md:border-r md:p-4 shrink-0">
      <div className="mb-4 px-1 py-1 md:mb-5">
        <BrandWordmark compact showTagline className="leading-none" />
      </div>

      <nav className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-1 md:gap-1 md:space-y-1 md:pr-1">
        {navLinks.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={`sidebar-item ${isActive ? "active" : ""}`}
            >
              <Icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="text-xs md:text-sm">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-3 dark:border-slate-800 md:pt-4">
        <NavLink
          to="/profile"
          className={`sidebar-item ${location.pathname === "/profile" ? "active" : ""}`}
        >
          <UserCircle2 className="h-4 w-4 md:h-5 md:w-5" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs md:text-sm">Profile</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{displayName}</span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
