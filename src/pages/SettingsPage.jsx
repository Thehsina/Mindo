import { useState } from "react"
import Navbar from "../components/Navbar"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../ThemeContext"
import { signOut } from "firebase/auth"
import { auth } from "../firebase"

export default function SettingsPage(){

const navigate = useNavigate()
const { darkMode, toggleDarkMode } = useTheme()
const [permission, setPermission] = useState(() => {
  if ("Notification" in window) return window.Notification.permission;
  return "default";
});

// no effect needed, state initialized from browser API

const requestNotifications = async ()=>{
if(!("Notification" in window)) return
try{
const result = await window.Notification.requestPermission()
setPermission(result)
}catch{
setPermission(window.Notification.permission)
}
}

const handleLogout = async () => {
  await signOut(auth);
  navigate("/");
};

return(

<div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex flex-col pt-20">

<Navbar title="Settings" showBack />

<div className="flex-1 p-8">

<button
className="glass-button-outline text-white/80 hover:text-white px-4 py-2 mb-4"
onClick={()=>navigate("/dashboard")}
>
← Back
</button>

<h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-6">Settings</h2>

<div className="glass p-4 mb-6">
<h3 className="font-semibold mb-2 text-cyan-300">🔔 Notifications</h3>
<p className="text-sm text-white/60 mb-3">
  Status: <span className="font-medium text-cyan-300">{permission}</span>
</p>
<button
onClick={requestNotifications}
className="glass-button"
>
Enable Notifications
</button>
</div>

<div className="glass p-4 mb-6">
<h3 className="font-semibold mb-4 text-cyan-300">🌙 Theme</h3>
<div className="flex items-center gap-3 cursor-pointer group">
<div className="glass-dark w-12 h-12 rounded-full flex items-center justify-center group-hover:glass-card transition">
<input
type="checkbox"
checked={darkMode}
onChange={toggleDarkMode}
className="w-5 h-5 accent-cyan-400 cursor-pointer"
/>
</div>
<span className="text-white/80 group-hover:text-white transition">Dark Mode</span>
</div>
</div>

<button onClick={handleLogout} className="glassmorphic bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white px-6 py-2 rounded-xl cursor-pointer border border-white/20">
Logout
</button>

</div>

</div>

)

}