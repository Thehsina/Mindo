import { useState, useEffect } from "react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase";
import { User, Mail, Check, AlertCircle } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!isSupabaseConfigured) {
          const localProfile = localStorage.getItem("tm.profile");
          const p = localProfile ? JSON.parse(localProfile) : {};
          const localUser = localStorage.getItem("tm.local_user");
          const u = localUser ? JSON.parse(localUser) : {};

          setProfile({
            full_name: p.full_name || u.user_metadata?.display_name || "Local User",
            email: p.email || u.email || "local@example.com",
          });
          setLoading(false);
          return;
        }

        const user = await getCurrentUser();
        if (!user) return;

        const isMissingProfileTable = (err) => {
          const message = String(err?.message || "");
          return err?.code === "PGRST205" || err?.code === "42P01" || message.includes("Could not find the table") || message.includes("schema cache");
        };

        try {
          const { data, error: fetchErr } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.id)
            .single();

          if (fetchErr && fetchErr.code !== "PGRST116") {
            if (isMissingProfileTable(fetchErr)) {
              throw fetchErr;
            }
            throw fetchErr;
          }

          const dbProfile = data || {};
          setProfile({
            full_name: dbProfile.full_name || user.user_metadata?.display_name || user.user_metadata?.full_name || "",
            email: dbProfile.email || user.email || "",
          });
        } catch (tableErr) {
          if (isMissingProfileTable(tableErr)) {
            const localProfile = localStorage.getItem("tm.profile");
            const p = localProfile ? JSON.parse(localProfile) : {};
            setProfile({
              full_name: p.full_name || user.user_metadata?.display_name || user.user_metadata?.full_name || "",
              email: p.email || user.email || "",
            });
            setError("");
            return;
          }
          throw tableErr;
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        setError("Could not load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const saveProfile = async () => {
    setError("");
    setSaved(false);
    setSaving(true);

    try {
      if (!isSupabaseConfigured) {
        const nextProfile = {
          full_name: profile.full_name.trim(),
          email: profile.email.trim(),
        };
        localStorage.setItem("tm.profile", JSON.stringify(nextProfile));

        const localUser = localStorage.getItem("tm.local_user");
        if (localUser) {
          const u = JSON.parse(localUser);
          u.user_metadata = {
            ...u.user_metadata,
            display_name: nextProfile.full_name,
            full_name: nextProfile.full_name,
          };
          localStorage.setItem("tm.local_user", JSON.stringify(u));
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        return;
      }

      const user = await getCurrentUser();
      if (!user) throw new Error("User session not found.");

      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          display_name: profile.full_name.trim(),
          full_name: profile.full_name.trim(),
        },
      });
      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: profile.email.trim(),
          full_name: profile.full_name.trim(),
          updated_at: new Date().toISOString(),
        });

      if (dbErr) {
        const message = String(dbErr?.message || "");
        if (dbErr.code === "PGRST205" || dbErr.code === "42P01" || message.includes("Could not find the table") || message.includes("schema cache")) {
          localStorage.setItem(
            "tm.profile",
            JSON.stringify({
              full_name: profile.full_name.trim(),
              email: profile.email.trim(),
            })
          );
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
          return;
        }
        throw dbErr;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500 dark:text-slate-400 animate-pulse font-medium text-sm">Loading profile...</div>
    </div>
  );

  const initialLetter = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U";

  return (
    <div className="animate-fade-in-up flex flex-col max-w-2xl mx-auto w-full pb-6 space-y-4 max-w-full overflow-x-hidden">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
          <User className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Profile</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Your account details and preferences.</p>
        </div>
      </div>

      <div className="bento-card !p-4 sm:!p-8">
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-black shadow-inner">
            {initialLetter}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-3 text-center">
            {profile.full_name || "User"}
          </h2>
          <span className="bg-slate-100 dark:bg-[#1a1a1e] text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full text-xs font-semibold mt-1.5">
            Active Account
          </span>
        </div>

        {error && (
          <div className="mb-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {saved && (
          <div className="mb-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            Saved changes successfully!
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <User className="w-4 h-4 text-slate-400" /> Full Name
              </label>
              <input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="John Doe"
                className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 focus:border-indigo-500 focus:ring-indigo-500/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                <Mail className="w-4 h-4 text-slate-400" /> Email Address
              </label>
              <input
                value={profile.email}
                disabled
                className="w-full bg-slate-100 dark:bg-[#121214] border border-slate-200 dark:border-slate-800/60 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Email cannot be changed.</p>
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-indigo-600/20 mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm"
          >
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}