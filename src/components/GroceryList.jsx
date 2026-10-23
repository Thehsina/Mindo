// src/components/GroceryList.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGroceryFirestore,
  addItemFirestore,
  deleteItemFirestore,
  updateItemFirestore,
  addItem,
  updateItem,
  deleteItem,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  mapGroceryFromDb,
} from "../redux/grocerySlice";
import { supabase, isSupabaseConfigured } from "../supabase";
import {
  Edit2,
  Trash2,
  Plus,
  Search,
  Check,
  ShoppingBag,
  BadgeCheck,
  X,
  ShoppingCart,
  Wallet,
  BarChart3,
} from "lucide-react";
import GroceryBudgetCard from "./GroceryBudgetCard";
import GroceryBudgetModal from "./GroceryBudgetModal";
import { fetchExpensesFirestore } from "../redux/expensesSlice";

const defaultBucketLabel = (listType) => (listType === "monthly" ? "This Month" : "This Week");

const formatDate = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const getGroupStats = (items = []) => {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
};

function GroceryCard({ group, onClick }) {
  const stats = getGroupStats(group.items);
  const previewItems = group.items.slice(0, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 sm:p-3 text-left shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-xs transition-all duration-200 dark:border-slate-800/80 dark:bg-[#16171a] cursor-pointer w-full max-w-full"
      aria-label={`Open ${group.label} grocery list`}
    >
      <div>
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 px-1.5 py-0.5 rounded-md">
              {group.listType === "monthly" ? "Monthly" : "Weekly"}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate mt-1 leading-tight">
              {group.label}
            </h3>
          </div>
          <span className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50 dark:bg-[#1f2025] p-1.5 text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </span>
        </div>

        {/* Item Preview list */}
        <div className="mt-2 space-y-0.5">
          {previewItems.length === 0 ? (
            <span className="text-[10px] text-slate-400 italic">Empty list</span>
          ) : (
            previewItems.map((it) => (
              <div key={it.id} className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 min-w-0">
                <span className={`w-1 h-1 rounded-full ${it.completed ? "bg-slate-300 dark:bg-slate-700" : "bg-indigo-500"} shrink-0`} />
                <span className={`truncate min-w-0 flex-1 ${it.completed ? "line-through opacity-60" : ""}`}>{it.name}</span>
                {it.quantity && <span className="text-[9px] opacity-70 shrink-0">({it.quantity})</span>}
              </div>
            ))
          )}
          {group.items.length > 3 && (
            <span className="text-[9px] font-medium text-slate-400 block pt-0.5 truncate">
              +{group.items.length - 3} more items...
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 pt-1.5 sm:mt-2.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-1">
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          <span>{stats.completed}/{stats.total} done</span>
          <span>{stats.percentage}%</span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              stats.percentage === 100 ? "bg-emerald-500" : stats.percentage >= 50 ? "bg-indigo-500" : "bg-amber-400"
            }`}
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>
    </button>
  );
}

function GroceryItemRow({
  item,
  isEditing,
  editName,
  onEditNameChange,
  editQuantity,
  onEditQuantityChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleComplete,
  onDelete,
}) {
  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row w-full items-stretch sm:items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
        <input
          type="text"
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
          autoFocus
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 font-medium"
        />
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={editQuantity}
            onChange={(event) => onEditQuantityChange(event.target.value)}
            placeholder="Qty"
            className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 font-medium text-center"
          />
          <button
            type="button"
            onClick={onSaveEdit}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 p-1.5 text-white hover:bg-indigo-700 cursor-pointer"
            aria-label={`Save ${item.name}`}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Cancel edit"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 dark:border-slate-800/80 dark:bg-[#1a1a1e]">
      <div
        onClick={onToggleComplete}
        className="flex items-center justify-center cursor-pointer shrink-0"
      >
        <input
          type="checkbox"
          checked={Boolean(item.completed)}
          onChange={() => {}}
          aria-label={item.completed ? `Mark ${item.name} as incomplete` : `Mark ${item.name} as complete`}
          className="h-4 w-4 cursor-pointer accent-indigo-600 shrink-0 rounded"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-xs font-semibold ${
              item.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"
            }`}
          >
            {item.name}
          </span>

          {item.quantity && (
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">({item.quantity})</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onStartEdit}
          className="inline-flex items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-300 cursor-pointer"
          aria-label={`Edit ${item.name}`}
        >
          <Edit2 className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 cursor-pointer"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function GroceryList() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.grocery || []);
  const weeklyBudget = useSelector((state) => state?.profile?.weekly_grocery_budget || 120);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showMobileChart, setShowMobileChart] = useState(false);
  const [listType, setListType] = useState("weekly");
  const [search, setSearch] = useState("");
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [bucketLabel, setBucketLabel] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Realtime multi-device sync
  useEffect(() => {
    // 1. Initial data fetch
    dispatch(fetchGroceryFirestore());
    dispatch(fetchExpensesFirestore());

    if (!isSupabaseConfigured || !supabase) return;

    // 2. Subscribe to INSERT, UPDATE, and DELETE changes on the grocery table
    const channel = supabase
      .channel("grocery-realtime-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "grocery" },
        (payload) => {
          if (payload?.new) {
            dispatch(addGroceryItem(mapGroceryFromDb(payload.new)));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "grocery" },
        (payload) => {
          if (payload?.new) {
            dispatch(updateGroceryItem(mapGroceryFromDb(payload.new)));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "grocery" },
        (payload) => {
          if (payload?.old?.id) {
            dispatch(deleteGroceryItem(payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.warn("[Grocery Realtime] Subscription error on channel.");
        }
      });

    // 3. Clean up subscription on unmount to prevent memory leaks
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedGroupKey(null);
        setConfirmDelete(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const currentListItems = useMemo(
    () => items.filter((item) => (item.listType || "weekly") === listType),
    [items, listType]
  );

  const groups = useMemo(() => {
    const map = new Map();

    currentListItems.forEach((item) => {
      const label = (item.bucketLabel || "").trim() || defaultBucketLabel(item.listType || listType);
      const key = label.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          listType: item.listType || listType,
          items: [],
          createdAt: item.createdAt || null,
        });
      }

      const existing = map.get(key);
      existing.items.push(item);
      if (item.createdAt && (!existing.createdAt || new Date(item.createdAt) > new Date(existing.createdAt))) {
        existing.createdAt = item.createdAt;
      }
    });

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [currentListItems, listType]);

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;

    return groups.filter((group) =>
      group.items.some((item) =>
        [item.name, item.quantity, item.bucketLabel, item.category].some((value) =>
          String(value || "").toLowerCase().includes(term)
        )
      )
    );
  }, [groups, search]);

  const selectedGroup = groups.find((group) => group.key === selectedGroupKey) || null;

  const filteredSelectedItems = useMemo(() => {
    if (!selectedGroup) return [];

    const term = search.trim().toLowerCase();
    if (!term) return selectedGroup.items;

    return selectedGroup.items.filter((item) =>
      [item.name, item.quantity, item.bucketLabel, item.category].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [search, selectedGroup]);

  const openGroup = (group) => {
    setSelectedGroupKey(group.key);
    setNewItemName("");
    setNewItemQuantity("");
    setEditingId(null);
    setEditName("");
    setEditQuantity("");
  };

  const handleAddCurrentList = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    const labelToUse = bucketLabel.trim() || defaultBucketLabel(listType);

    dispatch(
      addItemFirestore({
        name: trimmedName,
        quantity: newItemQuantity.trim(),
        bucketLabel: labelToUse,
        listType,
        category: labelToUse,
        completed: false,
      })
    );

    setNewItemName("");
    setNewItemQuantity("");
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity || "");
  };

  const saveEdit = (item) => {
    const trimmedName = editName.trim();
    if (!trimmedName || !selectedGroup) return;

    dispatch(
      updateItemFirestore({
        ...item,
        name: trimmedName,
        quantity: editQuantity.trim(),
        bucketLabel: selectedGroup.label,
        listType: selectedGroup.listType,
        category: selectedGroup.label,
      })
    );

    setEditingId(null);
    setEditName("");
    setEditQuantity("");
  };

  const clearCompleted = () => {
    if (!selectedGroup) return;
    const completed = filteredSelectedItems.filter((item) => item.completed);
    if (!completed.length) return;
    setConfirmDelete({ count: completed.length });
  };

  const confirmClearCompleted = () => {
    if (!confirmDelete || !selectedGroup) return;

    filteredSelectedItems
      .filter((item) => item.completed)
      .forEach((item) => dispatch(deleteItemFirestore(item.id)));

    setConfirmDelete(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-2.5 overflow-hidden max-w-full">
      {/* 1. COMPACT UNIFIED TOP HEADER */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
              Grocery
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5 truncate">
              Shopping lists & pantry
            </p>
          </div>
        </div>

        {/* Right Header Controls: Budget Button, List Type Toggle & Search */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Weekly Grocery Budget Button */}
          <button
            type="button"
            onClick={() => setShowBudgetModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#703ceb]/10 hover:bg-[#703ceb]/20 text-[#703ceb] dark:text-[#9b72f5] border border-[#703ceb]/30 text-xs font-bold transition cursor-pointer shadow-2xs whitespace-nowrap"
            title="Set weekly grocery budget"
          >
            <Wallet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Budget:</span>
            <span>{weeklyBudget} AED/wk</span>
          </button>

          {/* Weekly / Monthly Pill Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            {[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setListType(option.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  listType === option.value
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-[#121214] dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] px-2.5 py-1 w-28 sm:w-44 shadow-2xs">
            <Search className="h-3 w-3 text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              className="w-full border-none bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 2. MAIN BENTO CONTAINER (Responsive 2-column on desktop, optimized on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 flex-1 min-h-0 overflow-hidden">
        {/* Left: Grocery Lists & Items (Takes 8 cols on desktop) */}
        <div className="bento-card !p-2 sm:!p-3 rounded-2xl lg:col-span-8 xl:col-span-8 flex flex-col h-full min-h-0 overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs">
          {/* Quick Add Bar */}
          <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
            <div className="flex flex-col sm:flex-row gap-1.5">
              <input
                type="text"
                value={newItemName}
                onChange={(event) => setNewItemName(event.target.value)}
                placeholder="+ Add grocery item..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleAddCurrentList();
                }}
                className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#16171a] px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-indigo-400"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newItemQuantity}
                  onChange={(event) => setNewItemQuantity(event.target.value)}
                  placeholder="Qty"
                  className="w-16 sm:w-20 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#16171a] px-2 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 text-center focus:border-indigo-400"
                />
                <input
                  type="text"
                  value={bucketLabel}
                  onChange={(event) => setBucketLabel(event.target.value)}
                  placeholder={listType === "monthly" ? "Category / Month" : "Category / Week"}
                  className="w-28 sm:w-36 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#16171a] px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400 focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={handleAddCurrentList}
                  disabled={!newItemName.trim()}
                  className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Categories / Lists Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pt-2 pr-0.5 no-scrollbar">
            {/* Mobile-only Collapsible Grocery Budget Widget */}
            <div className="lg:hidden pb-2 shrink-0">
              {showMobileChart ? (
                <GroceryBudgetCard
                  onOpenBudgetModal={() => setShowBudgetModal(true)}
                  onCloseMobile={() => setShowMobileChart(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMobileChart(true)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#16171a] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-[#703ceb]" />
                    <span>Spend vs. Budget Trends</span>
                  </span>
                  <span className="text-[10px] font-bold text-[#703ceb] dark:text-[#9b72f5]">
                    Show Chart ▾
                  </span>
                </button>
              )}
            </div>

            {filteredGroups.length === 0 ? (
              <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                <ShoppingBag className="w-6 h-6 text-slate-300 dark:text-slate-700" />
                <span className="font-semibold">No groceries for {listType === "monthly" ? "This Month" : "This Week"}.</span>
                <span className="text-[10px]">Type an item name above to create your list.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5">
                {filteredGroups.map((group) => (
                  <GroceryCard key={group.key} group={group} onClick={() => openGroup(group)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Grocery Budget & Spend Analytics Chart (Desktop - Compact 4 cols) */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 flex-col h-full min-h-0 overflow-hidden">
          <GroceryBudgetCard onOpenBudgetModal={() => setShowBudgetModal(true)} />
        </div>
      </div>

      {/* Modal for viewing/editing selected grocery group */}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-4 animate-fade-in"
          onClick={() => setSelectedGroupKey(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#121214]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {selectedGroup.label}
                </h2>
                <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {filteredSelectedItems.length} items · {filteredSelectedItems.filter((item) => item.completed).length} completed
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                aria-label="Close"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checklist Items */}
            <div className="max-h-[50vh] overflow-y-auto px-4 py-3 space-y-1.5 no-scrollbar">
              {filteredSelectedItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-[#16171a]">
                  No items in this list yet.
                </div>
              ) : (
                filteredSelectedItems.map((item) => (
                  <GroceryItemRow
                    key={item.id}
                    item={item}
                    isEditing={editingId === item.id}
                    editName={editName}
                    onEditNameChange={setEditName}
                    editQuantity={editQuantity}
                    onEditQuantityChange={setEditQuantity}
                    onStartEdit={() => startEdit(item)}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditName("");
                      setEditQuantity("");
                    }}
                    onSaveEdit={() => saveEdit(item)}
                    onToggleComplete={() => dispatch(updateItemFirestore({ ...item, completed: !item.completed }))}
                    onDelete={() => dispatch(deleteItemFirestore(item.id))}
                  />
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-[#16171a] flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                Created {formatDate(selectedGroup.createdAt)}
              </span>

              {filteredSelectedItems.some((item) => item.completed) && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-[#1f2025] dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <BadgeCheck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Clear completed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#121214]">
            <div className="flex items-start gap-2.5">
              <div className="rounded-xl bg-rose-100 p-1.5 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete completed groceries?</h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  This will remove {confirmDelete.count} completed item{confirmDelete.count > 1 ? "s" : ""}.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearCompleted}
                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer shadow-2xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Weekly Budget Editor Modal */}
      {showBudgetModal && (
        <GroceryBudgetModal onClose={() => setShowBudgetModal(false)} />
      )}
    </div>
  );
}
