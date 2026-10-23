// src/components/GroceryBudgetModal.jsx
import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Wallet, Check, Sparkles } from "lucide-react";
import { setWeeklyGroceryBudget } from "../redux/profileSlice";

export default function GroceryBudgetModal({ onClose }) {
  const dispatch = useDispatch();
  const currentBudget = useSelector((state) => state?.profile?.weekly_grocery_budget || 120);
  const [budgetVal, setBudgetVal] = useState(String(currentBudget));
  const [saved, setSaved] = useState(false);

  const presets = [100, 120, 150, 200, 250, 300];

  const handleSave = (e) => {
    if (e) e.preventDefault();
    const val = parseFloat(budgetVal);
    if (!Number.isNaN(val) && val >= 0) {
      dispatch(setWeeklyGroceryBudget(val));
      setSaved(true);
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121214] p-5 sm:p-6 shadow-2xl relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 h-7 w-7 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-9 w-9 rounded-2xl bg-[#703ceb]/15 text-[#703ceb] flex items-center justify-center border border-[#703ceb]/30">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
              Weekly Grocery Budget
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Set your target spending per week
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Budget Target (AED)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                step="5"
                value={budgetVal}
                onChange={(e) => setBudgetVal(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#16171a] px-4 py-3 text-lg font-black text-slate-900 dark:text-white outline-none focus:border-[#703ceb] focus:ring-2 focus:ring-[#703ceb]/20"
                autoFocus
              />
              <span className="absolute right-4 text-xs font-bold text-slate-400">
                AED / week
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Quick Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBudgetVal(String(amt))}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    Number(budgetVal) === amt
                      ? "border-[#703ceb] bg-[#703ceb]/15 text-[#703ceb] dark:text-[#9b72f5]"
                      : "border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#16171a] text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {amt} AED
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!budgetVal}
              className="flex-1 py-2.5 rounded-xl bg-[#703ceb] hover:bg-[#5f2fd0] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#703ceb]/25 disabled:opacity-40"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Update Budget</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
