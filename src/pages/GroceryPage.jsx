// src/pages/GroceryPage.jsx
import GroceryList from "../components/GroceryList";

export default function GroceryPage() {
  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-2 sm:gap-2.5 overflow-hidden select-none">
      <GroceryList />
    </div>
  );
}