import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileNav from "./MobileNav";
import FloatingSamButton from "./FloatingSamButton";
import { fetchUserProfile } from "../redux/profileSlice";

export default function Layout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/dashboard";
  const isCalendar = location.pathname === "/calendar";
  const isSam = location.pathname === "/sam" || location.pathname === "/command-center";
  const isSettings = location.pathname === "/settings";
  const isExpenses = location.pathname === "/expenses";
  const isMealPlanner = location.pathname === "/meal-planner";
  const isGrocery = location.pathname === "/grocery";
  const isHabits = location.pathname === "/habits";
  const isFixedLayout =
    isDashboard ||
    isCalendar ||
    isSam ||
    isSettings ||
    isExpenses ||
    isMealPlanner ||
    isGrocery ||
    isHabits;

  useEffect(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);

  return (
    <div className="layout-container h-[100dvh] max-h-[100dvh] flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-[#0d0d0f]">
      <Sidebar />
      <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 overflow-hidden">
        {!isSam && <MobileHeader />}
        <main
          className={`main-content flex-1 overflow-x-hidden min-h-0 ${
            isSam
              ? "p-0 h-full overflow-hidden"
              : isFixedLayout
              ? "px-3 py-2 sm:px-6 sm:py-3 lg:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6 overflow-hidden h-full"
              : "px-3 py-2 sm:px-6 sm:py-3 lg:p-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-6 overflow-y-auto"
          }`}
        >
          <div className={`mx-auto w-full h-full flex flex-col min-h-0 ${isSam ? "max-w-full" : "max-w-7xl"}`}>
            <Outlet />
          </div>
        </main>
      </div>
      {!isSam && <MobileNav />}
      <FloatingSamButton />
    </div>
  );
}
