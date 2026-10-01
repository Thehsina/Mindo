import GroceryList from "../components/GroceryList";
import { ShoppingCart } from "lucide-react";

export default function GroceryPage() {
  return (
    <div className="animate-fade-in-up flex flex-col h-[calc(100vh-4rem)]">
      {/* Header Area */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-indigo-500" />
            Grocery List
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your shopping needs.</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bento-card flex-1 overflow-y-auto flex flex-col">
          <GroceryList />
        </div>
      </div>
    </div>
  );
}