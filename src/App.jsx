import { BrowserRouter, Routes, Route } from "react-router-dom"

import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import TasksPage from "./pages/TasksPage"
import CalendarPage from "./pages/CalendarPage"
import NotesPage from "./pages/NotesPage"
import GroceryPage from "./pages/GroceryPage"
import CommandCenterPage from "./pages/CommandCenterPage"
import SettingsPage from "./pages/SettingsPage"
import ProfilePage from "./pages/ProfilePage"
import ReminderCenter from "./reminders/ReminderCenter"
import Layout from "./components/Layout"
import { ThemeProvider } from "./ThemeContext"


export default function App(){

  return(
    <ThemeProvider>
      <BrowserRouter>
        <ReminderCenter/>
        <Routes>
          {/* Public / Auth Route */}
          <Route path="/" element={<LoginPage/>}/>

          {/* Protected Layout Routes */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage/>}/>
            <Route path="/tasks" element={<TasksPage/>}/>
            <Route path="/calendar" element={<CalendarPage/>}/>
            <Route path="/notes" element={<NotesPage/>}/>
            <Route path="/grocery" element={<GroceryPage/>}/>
            <Route path="/command-center" element={<CommandCenterPage/>}/>
            <Route path="/settings" element={<SettingsPage/>}/>
            <Route path="/profile" element={<ProfilePage/>}/>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )

}