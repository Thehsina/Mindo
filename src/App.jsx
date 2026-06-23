import { BrowserRouter, Routes, Route } from "react-router-dom"

import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import TasksPage from "./pages/TasksPage"
import CalendarPage from "./pages/CalendarPage"
import NotesPage from "./pages/NotesPage"
import GroceryPage from "./pages/GroceryPage"
import SettingsPage from "./pages/SettingsPage"
import ProfilePage from "./pages/ProfilePage"
import ReminderCenter from "./reminders/ReminderCenter"
import { ThemeProvider } from "./ThemeContext"


export default function App(){

return(

<ThemeProvider>
<BrowserRouter>
<ReminderCenter/>

<Routes>

<Route path="/" element={<LoginPage/>}/>
<Route path="/dashboard" element={<DashboardPage/>}/>
<Route path="/tasks" element={<TasksPage/>}/>
<Route path="/calendar" element={<CalendarPage/>}/>
<Route path="/notes" element={<NotesPage/>}/>
<Route path="/grocery" element={<GroceryPage/>}/>
<Route path="/settings" element={<SettingsPage/>}/>
<Route path="/profile" element={<ProfilePage/>}/>

</Routes>

</BrowserRouter>
</ThemeProvider>

)

}