import { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../ThemeContext";
import { useAuth } from "../AuthContext";
import { supabase, isSupabaseConfigured } from "../supabase";
import { useSelector } from "react-redux";
import {
  Bell,
  Moon,
  Sun,
  LogOut,
  Settings as SettingsIcon,
  LockKeyhole,
  Check,
  AlertCircle,
  X,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getBrowserNotificationPermission,
  readNotificationSettings,
  requestBrowserNotificationPermission,
  saveNotificationSettings,
} from "../utils/notifications";

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { signOut, user } = useAuth();
  const profile = useSelector((state) => state.profile || {});
  const navigate = useNavigate();

  const [permission, setPermission] = useState(() => getBrowserNotificationPermission());
  const [notificationSettings, setNotificationSettings] = useState(() => readNotificationSettings());
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ type: "", message: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Sara";

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await requestBrowserNotificationPermission();
      setPermission(result);
      setNotificationSettings((current) => saveNotificationSettings({ ...current, enabled: result === "granted" }));
    } catch {
      const nextPermission = getBrowserNotificationPermission();
      setPermission(nextPermission);
      setNotificationSettings((current) => saveNotificationSettings({ ...current, enabled: nextPermission === "granted" }));
    }
  };

  const updateNotificationSetting = (key, value) => {
    const next = saveNotificationSettings({ ...notificationSettings, [key]: value });
    setNotificationSettings(next);
  };

  const handlePasswordChange = async (e) => {
    if (e) e.preventDefault();
    setPasswordStatus({ type: "", message: "" });

    if (!isSupabaseConfigured) {
      setPasswordStatus({
        type: "error",
        message: "Password change is available when Supabase is connected.",
      });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordStatus({ type: "error", message: "Please fill in both password fields." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "Password must be at least 6 characters." });
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      setPasswordStatus({ type: "success", message: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordStatus({ type: "", message: "" });
      }, 1500);
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: error?.message || "Could not update password. Please try again.",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
      localStorage.removeItem("tm.local_user");
      navigate("/");
    }
  };

  return (
    <div className="h-full flex flex-col justify-start gap-2 sm:gap-3 max-w-3xl mx-auto w-full overflow-hidden select-none">
      {/* Compact Top Header */}
      <div className="shrink-0 flex items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <SettingsIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              Settings
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5">
              App preferences & security
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Minddo v2.4
          </span>
        </div>
      </div>

      {/* Main Settings Bento Area */}
      <div className="flex flex-col gap-2 sm:gap-2.5 flex-1 min-h-0 justify-start">
        {/* Row 1: Appearance & Security (2 equal columns on mobile and desktop) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 shrink-0">
          {/* Tile 1: Dark Mode */}
          <div className="bento-card !p-2.5 sm:!p-3.5 rounded-2xl flex flex-col justify-between hover:border-purple-300/60 dark:hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center shrink-0">
                {darkMode ? <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </div>

              {/* iOS Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0" aria-label="Toggle Dark Mode">
                <input
                  id="dark-theme-toggle"
                  type="checkbox"
                  className="sr-only peer"
                  checked={darkMode}
                  onChange={toggleDarkMode}
                />
                <div className="w-10 h-5 sm:w-11 sm:h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="mt-1 sm:mt-1.5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                Dark Theme
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {darkMode ? "Dark active" : "Light active"}
              </p>
            </div>
          </div>

          {/* Tile 2: Password & Security */}
          <div className="bento-card !p-2.5 sm:!p-3.5 rounded-2xl flex flex-col justify-between hover:border-violet-300/60 dark:hover:border-violet-500/40 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center shrink-0">
                <LockKeyhole className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-white shadow-xs transition cursor-pointer shrink-0"
              >
                Change
              </button>
            </div>

            <div className="mt-1 sm:mt-1.5">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                Password
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Update credentials
              </p>
            </div>
          </div>
        </div>

        {/* Row 2: Push Notifications Card */}
        <div className="bento-card !p-2.5 sm:!p-3.5 rounded-2xl flex flex-col justify-between shrink-0 hover:border-blue-300/60 dark:hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate">
                  Push Notifications
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      permission === "granted" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {permission === "granted" ? "Active" : "Prompt required"}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={requestNotifications}
              disabled={permission === "granted"}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 text-white px-2.5 py-1 sm:px-3 sm:py-1 rounded-xl font-semibold transition text-[11px] sm:text-xs shrink-0 cursor-pointer disabled:cursor-default"
            >
              {permission === "granted" ? "Enabled" : "Enable"}
            </button>
          </div>

          {/* Compact 3-Column Toggle Chips */}
          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
            <label className="flex items-center justify-between gap-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#13161a] px-2 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
              <span className="truncate">Tasks</span>
              <input
                type="checkbox"
                checked={Boolean(notificationSettings.taskReminders)}
                onChange={(e) => updateNotificationSetting("taskReminders", e.target.checked)}
                className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#13161a] px-2 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
              <span className="truncate">Groceries</span>
              <input
                type="checkbox"
                checked={Boolean(notificationSettings.groceryReminders)}
                onChange={(e) => updateNotificationSetting("groceryReminders", e.target.checked)}
                className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-center justify-between gap-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#13161a] px-2 py-1.5 text-[11px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
              <span className="truncate">Alerts</span>
              <input
                type="checkbox"
                checked={Boolean(notificationSettings.enabled)}
                onChange={(e) => updateNotificationSetting("enabled", e.target.checked)}
                className="h-3.5 w-3.5 accent-indigo-600 rounded cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Row 3: Session & Logout Card */}
        <div className="bento-card !p-2.5 sm:!p-3.5 rounded-2xl border-rose-200/70 dark:border-rose-900/40 bg-gradient-to-r from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-[#121214] dark:to-[#121214] flex items-center justify-between shrink-0 hover:border-rose-300/80 transition-all shadow-2xs">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-500/30">
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-tight truncate">
                Active Session
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Signed in as <span className="font-medium text-slate-700 dark:text-slate-300">{displayName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shadow-xs shadow-rose-600/25 cursor-pointer text-xs shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Password Change Modal Overlay */}
      {showPasswordModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowPasswordModal(false);
                setPasswordStatus({ type: "", message: "" });
              }
            }}
          >
            <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#16171b] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl animate-scale-up">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <LockKeyhole className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                      Change Password
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      Update your account security
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordStatus({ type: "", message: "" });
                  }}
                  className="w-7 h-7 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Password Form */}
              <form onSubmit={handlePasswordChange} className="mt-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full bg-slate-50 dark:bg-[#1f2024] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-50 dark:bg-[#1f2024] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>

                {passwordStatus.message && (
                  <div
                    className={`flex items-center gap-2 text-xs rounded-xl border px-3 py-2 ${
                      passwordStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {passwordStatus.type === "success" ? (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{passwordStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordStatus({ type: "", message: "" });
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold shadow-xs disabled:opacity-60 transition cursor-pointer"
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}