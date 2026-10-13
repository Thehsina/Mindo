import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

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
import MinddoSplashScreen from "./components/MinddoSplashScreen";
import { ThemeProvider } from "./ThemeContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { SplashProvider, useSplash } from "./SplashContext";
import { fetchUserProfile } from "./redux/profileSlice";

import ErrorBoundary from "./components/ErrorBoundary";

function AppContent() {
  const { checkAuth } = useAuth();
  const { triggerSplashTransition, hideSplash } = useSplash();
  const dispatch = useDispatch();
  const location = useLocation();

  const startupDoneRef = useRef(false);

  useEffect(() => {
    let active = true;

    if (startupDoneRef.current) return;

    // Detect if this is an in-app page refresh (reload) vs fresh app open
    const isPageReload = (() => {
      try {
        const navEntries = typeof performance !== "undefined" && performance.getEntriesByType ? performance.getEntriesByType("navigation") : [];
        if (navEntries && navEntries.length > 0) {
          return navEntries[0].type === "reload";
        }
        if (typeof performance !== "undefined" && performance.navigation) {
          return performance.navigation.type === 1;
        }
      } catch (_) {}
      return Boolean(sessionStorage.getItem("minddo_app_loaded"));
    })();

    // 5000ms on fresh app open, but a fast ~1200ms on refresh so it feels fast and responsive
    const MIN_SPLASH_DURATION = isPageReload ? 1200 : 5000;
    const timerPromise = new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_DURATION));
    const safetyTimeout = new Promise((resolve) => setTimeout(() => resolve(null), 8000));

    const initializeApp = async () => {
      try {
        const [resolvedUser] = await Promise.all([
          Promise.race([checkAuth(), safetyTimeout]),
          timerPromise,
        ]);

        if (!active) return;

        if (resolvedUser) {
          try {
            await dispatch(fetchUserProfile());
          } catch (e) {
            console.debug("Non-fatal profile preload info:", e);
          }
        }

        if (!active) return;

        const pathname = window.location.pathname;
        const search = window.location.search;
        const hash = window.location.hash;
        const publicAuthPaths = ["/", "/login", "/signin", "/signup"];

        startupDoneRef.current = true;
        try {
          sessionStorage.setItem("minddo_app_loaded", "true");
        } catch (_) {}

        if (pathname === "/splash") {
          // Preview route stays on /splash
          hideSplash();
        } else if (resolvedUser) {
          // Authenticated user:
          if (publicAuthPaths.includes(pathname)) {
            triggerSplashTransition("/dashboard");
          } else {
            // Keep requested deep link
            hideSplash();
          }
        } else {
          // Unauthenticated user:
          if (publicAuthPaths.includes(pathname)) {
            if (pathname !== "/login") {
              triggerSplashTransition("/login");
            } else {
              hideSplash();
            }
          } else {
            // Protected route requested while unauthenticated
            triggerSplashTransition("/login");
          }
        }
      } catch (err) {
        console.error("App initialization error:", err);
        startupDoneRef.current = true;
        hideSplash();
      }
    };

    initializeApp();

    return () => {
      active = false;
    };
  }, [checkAuth, dispatch, triggerSplashTransition, hideSplash]);

  return (
    <ErrorBoundary>
      <ReminderCenter />
      <Routes>
        {/* Public / Auth Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signin" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage />} />

        {/* Standalone Splash Screen Preview Route */}
        <Route path="/splash" element={<MinddoSplashScreen />} />

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
            <Route path="/sam" element={<CommandCenterPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/brain-dump" element={<BrainDumpPage />} />
          </Route>
        </Route>

        {/* Fallback Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <SplashProvider>
            <AppContent />
          </SplashProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}