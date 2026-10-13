import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { User, Mail, Check, AlertCircle, Pencil } from "lucide-react";
import { fetchUserProfile, saveUserProfile, clearProfileStatus } from "../redux/profileSlice";
import { getAvatarUrl } from "../utils/avatars";
import { useAuth } from "../AuthContext";
import AvatarSelectionModal from "../components/AvatarSelectionModal";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const profileState = useSelector((state) => state.profile);

  const fallbackName =
    profileState.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "User";

  const fallbackEmail = profileState.email || user?.email || "";

  const [fullNameInput, setFullNameInput] = useState("");
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [localFeedback, setLocalFeedback] = useState({ success: "", error: "" });

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (profileState.full_name) {
      setFullNameInput(profileState.full_name);
    } else if (fallbackName && fallbackName !== "User" && !fullNameInput) {
      setFullNameInput(fallbackName);
    }
  }, [profileState.full_name, fallbackName]);

  useEffect(() => {
    if (profileState.savedSuccess) {
      setLocalFeedback({ success: "Saved changes successfully!", error: "" });
      const timer = setTimeout(() => {
        setLocalFeedback({ success: "", error: "" });
        dispatch(clearProfileStatus());
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (profileState.error) {
      setLocalFeedback({ success: "", error: profileState.error });
    }
  }, [profileState.savedSuccess, profileState.error, dispatch]);

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setLocalFeedback({ success: "", error: "" });
    await dispatch(saveUserProfile({ full_name: fullNameInput }));
  };

  const handleAvatarSave = async (newAvatarUrl) => {
    await dispatch(saveUserProfile({ avatar_url: newAvatarUrl }));
    setIsAvatarModalOpen(false);
  };

  if (profileState.loading && !profileState.full_name && !profileState.email && !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400 animate-pulse font-medium text-sm">
          Loading profile...
        </div>
      </div>
    );
  }

  const avatarSrc = getAvatarUrl(profileState.avatar_url, fullNameInput || fallbackName);

  return (
    <div className="animate-fade-in-up flex flex-col max-w-xl mx-auto w-full pb-6 sm:pb-8 space-y-3 sm:space-y-4 max-w-full">
      {/* Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
            Profile
          </h1>
          <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            Your account details, profile avatar, and preferences.
          </p>
        </div>
      </div>

      <div className="bento-card !p-4 sm:!p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800">
        {/* Profile Avatar Card with WhatsApp-Style Edit Overlay */}
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div
            className="relative group cursor-pointer select-none"
            onClick={() => setIsAvatarModalOpen(true)}
            title="Click to change profile picture"
          >
            {/* Circular Avatar */}
            <img
              src={avatarSrc}
              alt="User profile avatar"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-md border-2 border-white dark:border-[#15161a] ring-4 ring-indigo-500/20 group-hover:ring-indigo-500/40 group-hover:scale-105 transition-all duration-200"
            />

            {/* WhatsApp-Style Edit / Pencil Icon Overlay */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAvatarModalOpen(true);
              }}
              className="absolute bottom-0 right-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-2 border-white dark:border-[#15161a] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title="Edit profile picture"
              aria-label="Edit profile picture"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-2.5 text-center leading-tight">
            {fullNameInput || fallbackName}
          </h2>
          <span className="bg-slate-100 dark:bg-[#1a1a1e] text-slate-500 dark:text-slate-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mt-1">
            Active Account
          </span>
        </div>

        {/* Feedback Alerts */}
        {localFeedback.error && (
          <div className="mb-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localFeedback.error}</span>
          </div>
        )}

        {localFeedback.success && (
          <div className="mb-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{localFeedback.success}</span>
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-3.5 sm:space-y-4">
          <div className="space-y-3 sm:space-y-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" /> Full Name
              </label>
              <input
                type="text"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-slate-800/60 focus:border-indigo-500 focus:ring-indigo-500/50 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-shadow"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" /> Email Address
              </label>
              <input
                type="email"
                value={profileState.email || user?.email || fallbackEmail || ""}
                disabled
                className="w-full bg-slate-100 dark:bg-[#121214] border border-slate-200 dark:border-slate-800/60 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed focus:outline-none"
              />
              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                Email address is managed via your sign-in account.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={profileState.saving}
            className="w-full min-h-[40px] sm:min-h-[44px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 sm:py-3 rounded-xl transition-colors shadow-md shadow-indigo-600/20 mt-1 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer text-xs sm:text-sm"
          >
            {profileState.saving ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Avatar Selection Modal */}
      <AvatarSelectionModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={profileState.avatar_url}
        userName={fullNameInput || fallbackName}
        onSave={handleAvatarSave}
        isSaving={profileState.saving}
      />
    </div>
  );
}