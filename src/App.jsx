import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import HabitsPage from "./pages/HabitsPage";
import CalendarPage from "./pages/CalendarPage";
import NotesPage from "./pages/NotesPage";
import GroceryPage from "./pages/GroceryPage";
import MealPlannerPage from "./pages/MealPlannerPage";
import ExpensesPage from "./pages/ExpensesPage";
import CommandCenterPage from "./pages/CommandCenterPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import BrainDumpPage from "./pages/BrainDumpPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ReminderCenter from "./reminders/ReminderCenter";
import Layout from "./components/Layout";
import { ThemeProvider } from "./ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ReminderCenter />
        <Routes>
          {/* Public / Auth Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />

          {/* Protected Route Boundary */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/grocery" element={<GroceryPage />} />
              <Route path="/meal-planner" element={<MealPlannerPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/money" element={<ExpensesPage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/brain-dump" element={<BrainDumpPage />} />
            </Route>
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}