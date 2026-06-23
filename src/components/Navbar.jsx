// src/components/Navbar.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";

const navLinks = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/tasks", label: "Tasks" },
  { path: "/calendar", label: "Calendar" },
  { path: "/notes", label: "Notes" },
  { path: "/grocery", label: "Grocery" },
  { path: "/settings", label: "Settings" },
];

export default function Navbar({ title = "Task Manager", showBack = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = auth.currentUser;

  return (
    <header className="glass fixed top-0 left-0 right-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-white/20 shadow-2xl">
      <div className="flex items-center justify-between gap-4">
        {showBack ? (
          <button
            onClick={() => navigate("/dashboard")}
            className="font-bold cursor-pointer hover:underline"
          >
            &larr; Back
          </button>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </h1>
          {user && user.displayName && (
            <p className="text-xs text-white/60">{user.displayName}</p>
          )}
        </div>
      </div>
      <nav className="flex flex-wrap items-center gap-2">
        {navLinks.map(({ path, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium cursor-pointer transition ${
              location.pathname === path
                ? "glass-card bg-gradient-to-r from-cyan-500/40 to-purple-500/40 text-cyan-300 border-cyan-300/40"
                : "glass-button-outline text-white/80 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="ml-2 flex items-center gap-2 px-3 py-1.5 glass-button-outline text-white/80 hover:text-white"
          >
            <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center text-slate-900 font-bold text-xs">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="hidden sm:inline">{user.displayName || "User"}</span>
          </button>
        )}
      </nav>
    </header>
  );
}