import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";
import MobileNav from "./MobileNav";

export default function Layout() {
  return (
    <div className="layout-container flex-col md:flex-row overflow-x-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 overflow-hidden">
        <MobileHeader />
        <main className="main-content flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-6 min-h-0">
          <div className="mx-auto w-full max-w-7xl h-full flex flex-col min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
