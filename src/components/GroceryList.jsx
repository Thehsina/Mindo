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
  const createdDate = group.createdAt ? formatDate(group.createdAt) : "No date";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full min-h-[140px] w-full cursor-pointer flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      aria-label={`Open ${group.label} grocery list`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            {group.listType === "monthly" ? "Monthly" : "Weekly"}
          </p>
          <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{group.label}</h3>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 p-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          <ShoppingBag className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>{stats.total} items</span>
          <span>{stats.completed}/{stats.total} done</span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full ${
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
      <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <input
          type="text"
          value={editName}
          onChange={(event) => onEditNameChange(event.target.value)}
          autoFocus
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <input
          type="text"
          value={editQuantity}
          onChange={(event) => onEditQuantityChange(event.target.value)}
          placeholder="Qty"
          className="w-24 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={onSaveEdit}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 p-2 text-white transition hover:bg-indigo-700"
          aria-label={`Save ${item.name}`}
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Cancel edit"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/70">
      <input
        type="checkbox"
        checked={Boolean(item.completed)}
        onChange={onToggleComplete}
        aria-label={item.completed ? `Mark ${item.name} as incomplete` : `Mark ${item.name} as complete`}
        className="h-4 w-4 cursor-pointer accent-indigo-600"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-sm font-medium ${
              item.completed ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-200"
            }`}
          >
            {item.name}
          </span>

          {item.quantity && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.quantity}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onStartEdit}
          className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-indigo-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-indigo-300"
          aria-label={`Edit ${item.name}`}
        >
          <Edit2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
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

    dispatch(
      addItemFirestore({
        name: trimmedName,
        quantity: newItemQuantity.trim(),
        bucketLabel: defaultBucketLabel(listType),
        listType,
        category: defaultBucketLabel(listType),
        completed: false,
      })
    );

    setNewItemName("");
    setNewItemQuantity("");
  };

  const handleAddToSelectedGroup = () => {
    if (!selectedGroup) return;

    const trimmedName = newItemName.trim();
    if (!trimmedName) return;

    dispatch(
      addItemFirestore({
        name: trimmedName,
        quantity: newItemQuantity.trim(),
        bucketLabel: selectedGroup.label,
        listType: selectedGroup.listType,
        category: selectedGroup.label,
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
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex w-full items-center gap-2 xl:max-w-[420px]">
          <div className="flex flex-1 rounded-xl bg-zinc-100 p-1 dark:bg-[#1a1a1e]">
            {[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setListType(option.value)}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  listType === option.value
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-[#2a2a2e] dark:text-indigo-400"
                    : "text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-[#141417] dark:text-zinc-300">
            {listType === "weekly" ? <ShoppingBag className="h-4 w-4" /> : <Package className="h-4 w-4" />}
            {listType === "weekly" ? "Weekly plan" : "Monthly plan"}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-[#1a1a1e] xl:min-w-[260px] xl:max-w-[320px]">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search groceries"
            className="w-full border-none bg-transparent text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-[#1a1a1e]">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newItemName}
            onChange={(event) => setNewItemName(event.target.value)}
            placeholder="Add grocery item"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAddCurrentList();
            }}
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <input
            type="text"
            value={newItemQuantity}
            onChange={(event) => setNewItemQuantity(event.target.value)}
            placeholder="Qty"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:max-w-36"
          />
          <button
            type="button"
            onClick={handleAddCurrentList}
            disabled={!newItemName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
          No grocery lists found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredGroups.map((group) => (
            <GroceryCard key={group.key} group={group} onClick={() => openGroup(group)} />
          ))}
        </div>
      )}

      {selectedGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setSelectedGroupKey(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="grocery-modal-title"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <div>
                <h2 id="grocery-modal-title" className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedGroup.label}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {filteredSelectedItems.length} items · {filteredSelectedItems.filter((item) => item.completed).length} completed
                </p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Added {formatDate(selectedGroup.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedGroupKey(null)}
                aria-label="Close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {filteredSelectedItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
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
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Actions
                </h3>

                {filteredSelectedItems.some((item) => item.completed) && (
                  <button
                    type="button"
                    onClick={clearCompleted}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Clear completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Delete completed groceries?</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  This will remove {confirmDelete.count} completed item{confirmDelete.count > 1 ? "s" : ""} from this list.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearCompleted}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
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

