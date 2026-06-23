import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Navbar from "../components/Navbar";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    mobile: "",
    email: auth.currentUser?.email || "",
    dob: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, "profiles", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile((p) => ({ ...p, ...docSnap.data() }));
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const saveProfile = async () => {
    if (!auth.currentUser) return;
    await setDoc(doc(db, "profiles", auth.currentUser.uid), profile);
    alert("Profile saved!");
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center">
      <div className="text-cyan-300 text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col pt-20">
      <Navbar title="Profile" showBack />
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-8">Profile</h2>
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-cyan-500/40 to-purple-500/40 rounded-full flex items-center justify-center text-5xl border-2 border-cyan-400/50 shadow-2xl">
            {auth.currentUser?.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : "U"}
          </div>
          <p className="text-cyan-300/80 text-sm mt-4">{auth.currentUser?.displayName || "User"}</p>
        </div>
        <div className="glass-card p-8 max-w-md mx-auto space-y-6">
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">👤 Name</label>
            <input
              value={auth.currentUser?.displayName || ""}
              readOnly
              className="glass-input w-full bg-white/5 cursor-not-allowed opacity-60"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">📧 Email</label>
            <input
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="glass-input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">📱 Mobile</label>
            <input
              value={profile.mobile}
              onChange={(e) => setProfile({ ...profile, mobile: e.target.value })}
              className="glass-input w-full"
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-cyan-300 mb-2">🗓️ Date of Birth</label>
            <input
              type="date"
              value={profile.dob}
              onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
              className="glass-input w-full"
            />
          </div>
          <button
            onClick={saveProfile}
            className="glass-button w-full mt-4"
          >
            ✓ Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}