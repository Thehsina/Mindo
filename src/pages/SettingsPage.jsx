import { useState } from "react";
import { useTheme } from "../ThemeContext";
import { supabase, isSupabaseConfigured } from "../supabase";
import { Bell, Moon, LogOut, Settings as SettingsIcon, LockKeyhole, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getBrowserNotificationPermission,
  readNotificationSettings,
  requestBrowserNotificationPermission,
  saveNotificationSettings,
} from "../utils/notifications";

export default function SettingsPage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission());
  const [notificationSettings, setNotificationSettings] = useState(() => readNotificationSettings());
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState({ type: "", message: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

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

  const handlePasswordChange = async () => {
    setPasswordStatus({ type: "", message: "" });

    if (!isSupabaseConfigured) {
      setPasswordStatus({
        type: "error",
        message: "Password changes are available when Supabase is connected.",
      });
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setPasswordStatus({ type: "error", message: "Please enter both password fields." });
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
    if (!isSupabaseConfigured) {
      localStorage.removeItem("tm.local_user");
      navigate("/");
      return;
    }
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="animate-fade-in-up flex flex-col max-w-4xl mx-auto w-full pb-2">
      <div className="mb-5 flex items-center gap-3">
        <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your app preferences and account.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bento-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg flex items-center justify-center shrink-0">
                <LockKeyhole className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg">Change Password</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Update your account password for better security.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-w-lg">
            {!showPasswordForm ? (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Change password
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-shadow"
                  />
                </div>

                {passwordStatus.message && (
                  <div
                    className={`flex items-center gap-2 text-sm rounded-xl border px-3 py-2 ${
                      passwordStatus.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {passwordStatus.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {passwordStatus.message}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordForm(false)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bento-card p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">Push Notifications</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Current Status: <span className="font-medium text-slate-700 dark:text-slate-300">{permission}</span>
                </p>
              </div>
            </div>
            <button
              onClick={requestNotifications}
              disabled={permission === "granted"}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm"
            >
              {permission === "granted" ? "Enabled" : "Enable"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#13161a]">
              <span>Task reminders</span>
              <input type="checkbox" checked={Boolean(notificationSettings.taskReminders)} onChange={(event) => updateNotificationSetting("taskReminders", event.target.checked)} className="h-4 w-4 accent-indigo-500" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#13161a]">
              <span>Grocery alerts</span>
              <input type="checkbox" checked={Boolean(notificationSettings.groceryReminders)} onChange={(event) => updateNotificationSetting("groceryReminders", event.target.checked)} className="h-4 w-4 accent-indigo-500" />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#13161a]">
              <span>Enabled</span>
              <input type="checkbox" checked={Boolean(notificationSettings.enabled)} onChange={(event) => updateNotificationSetting("enabled", event.target.checked)} className="h-4 w-4 accent-indigo-500" />
            </label>
          </div>
        </div>

        <div className="bento-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Dark Theme</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Switch between light and dark mode.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="bento-card p-4 sm:p-5 border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-base">Logout</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sign out of your account on this device.
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl font-medium transition-colors border border-rose-200 dark:border-rose-500/30 whitespace-nowrap text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}