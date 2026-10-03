import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGroceryFirestore, addItemFirestore, deleteItemFirestore, updateItemFirestore } from "../redux/grocerySlice";
import { Edit2, Trash2, Plus, Search, Check, ShoppingBag, Package, BadgeCheck, X } from "lucide-react";

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

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-2xs hover:shadow-md transition-all duration-200 dark:border-slate-800/80 dark:bg-[#121214] hover:border-indigo-400 dark:hover:border-indigo-500/50 cursor-pointer min-h-[140px] w-full max-w-full"
      aria-label={`Open ${group.label} grocery list`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
            {group.listType === "monthly" ? "This Month" : "This Week"}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate mt-2">{group.label}</h3>
        </div>
        <span className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] p-2 text-indigo-600 dark:text-indigo-400 shrink-0">
          <ShoppingBag className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
          <span>{stats.total} items</span>
          <span>{stats.completed}/{stats.total} done</span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
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
      <div className="flex flex-col sm:flex-row w-full items-stretch sm:items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950">
        <input
          type="text"
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
          autoFocus
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 font-medium"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editQuantity}
            onChange={(event) => onEditQuantityChange(event.target.value)}
            placeholder="Qty"
            className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 font-medium"
          />
          <button
            type="button"
            onClick={onSaveEdit}
            className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-xl bg-indigo-600 p-2 text-white transition hover:bg-indigo-700 cursor-pointer"
            aria-label={`Save ${item.name}`}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            aria-label="Cancel edit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800/80 dark:bg-[#1a1a1e]">
      <div
        onClick={onToggleComplete}
        className="flex min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 items-center justify-center cursor-pointer shrink-0"
      >
        <input
          type="checkbox"
          checked={Boolean(item.completed)}
          onChange={() => {}}
          aria-label={item.completed ? `Mark ${item.name} as incomplete` : `Mark ${item.name} as complete`}
          className="h-5 w-5 cursor-pointer accent-indigo-600 shrink-0 rounded"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              item.completed ? "text-slate-400 line-through dark:text-slate-500" : "text-slate-900 dark:text-white"
            }`}
          >
            {item.name}
          </span>

          {item.quantity && (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">({item.quantity})</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onStartEdit}
          className="inline-flex min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-300 cursor-pointer"
          aria-label={`Edit ${item.name}`}
        >
          <Edit2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-xl p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 cursor-pointer"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function GroceryList() {
  const dispatch = useDispatch();
  const items = useSelector((state) => state.grocery || []);
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

  useEffect(() => {
    dispatch(fetchGroceryFirestore());
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
    <div className="flex md:h-full md:min-h-0 flex-col gap-3 sm:gap-4 md:overflow-hidden max-w-full">
      {/* 1. Toggle & Search Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0 max-w-full">
        <div className="flex items-center gap-2 max-w-full">
          {/* This Week / This Month Toggle */}
          <div className="flex flex-1 rounded-2xl bg-slate-100 p-1 dark:bg-[#1a1a1e]">
            {[
              { value: "weekly", label: "This Week" },
              { value: "monthly", label: "This Month" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setListType(option.value)}
                className={`flex-1 min-h-[44px] sm:min-h-0 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition cursor-pointer ${
                  listType === option.value
                    ? "bg-indigo-600 text-white shadow-xs dark:bg-indigo-500"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <span className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {listType === "weekly" ? <ShoppingBag className="h-4 w-4 text-indigo-500" /> : <Package className="h-4 w-4 text-indigo-500" />}
            {listType === "weekly" ? "Weekly List" : "Monthly List"}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#1a1a1e] px-3.5 py-2 w-full sm:max-w-xs">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groceries..."
            className="w-full border-none bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
          />
        </div>
      </div>

      {/* 2. Quick Add Item bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800/80 dark:bg-[#1a1a1e] shrink-0 max-w-full">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            placeholder="+ Add grocery item..."
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAddCurrentList();
            }}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121214] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newItemQuantity}
              onChange={(event) => setNewItemQuantity(event.target.value)}
              placeholder="Qty"
              className="flex-1 sm:w-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121214] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
            />
            <input
              type="text"
              value={bucketLabel}
              onChange={(event) => setBucketLabel(event.target.value)}
              placeholder={listType === "monthly" ? "Month label" : "Week label"}
              className="flex-1 sm:w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121214] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCurrentList}
            disabled={!newItemName.trim()}
            className="inline-flex min-h-[44px] sm:min-h-0 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50 shrink-0 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add item</span>
          </button>
        </div>
      </div>

      {/* 3. Categories / Lists Cards Grid */}
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto pr-0 sm:pr-1 max-w-full">
        {filteredGroups.length === 0 ? (
          <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 p-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <span className="font-semibold">No grocery items found for {listType === "monthly" ? "This Month" : "This Week"}.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 max-w-full">
            {filteredGroups.map((group) => (
              <GroceryCard key={group.key} group={group} onClick={() => openGroup(group)} />
            ))}
          </div>
        )}
      </div>

      {/* Modal for viewing/editing selected grocery group */}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs sm:p-6 animate-fade-in"
          onClick={() => setSelectedGroupKey(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="grocery-modal-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-[#121214]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 sm:px-5 py-3.5 dark:border-slate-800">
              <div>
                <h2 id="grocery-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {selectedGroup.label}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {filteredSelectedItems.length} items · {filteredSelectedItems.filter((item) => item.completed).length} completed
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto px-4 sm:px-5 py-4 space-y-2.5">
              {filteredSelectedItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs sm:text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-slate-400">
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

            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-5 py-3.5 dark:border-slate-800 dark:bg-[#1a1a1e] flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Created {formatDate(selectedGroup.createdAt)}
              </span>

              {filteredSelectedItems.some((item) => item.completed) && (
                <button
                  type="button"
                  onClick={clearCompleted}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <BadgeCheck className="h-4 w-4" />
                  Clear completed
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-[#121214]">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete completed groceries?</h3>
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
                  This will remove {confirmDelete.count} completed item{confirmDelete.count > 1 ? "s" : ""}.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearCompleted}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
