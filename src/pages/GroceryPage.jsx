import Navbar from "../components/Navbar";
import GroceryList from "../components/GroceryList";

export default function GroceryPage() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 overflow-hidden pt-20">
      <Navbar title="Grocery" showBack />
      <div className="flex-1 flex flex-col min-h-0 p-8 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-cyan-300 dark:text-orange-400 mb-6 shrink-0">Grocery List</h2>
        <GroceryList />
      </div>
    </div>
  );
}