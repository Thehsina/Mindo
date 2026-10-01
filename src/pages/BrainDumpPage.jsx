import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sparkles, Check, Trash2, Plus, ArrowRight, AlertCircle } from "lucide-react";
import { addTaskFirestore, fetchTasksFirestore } from "../redux/tasksSlice";
import { addItemFirestore, fetchGroceryFirestore } from "../redux/grocerySlice";
import { parseBrainDump, buildDuplicateKey } from "../utils/brainDump";

const normalizeDateValue = (date) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function BrainDumpPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.tasks || []);
  const grocery = useSelector((state) => state.grocery || []);
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    dispatch(fetchTasksFirestore());
    dispatch(fetchGroceryFirestore());
  }, [dispatch]);

  const selectedItemsCount = useMemo(
    () => items.filter((item) => item.selected).length,
    [items]
  );

  const handleOrganize = () => {
    const parsed = parseBrainDump(draft);
    if (!draft.trim()) {
      setError("Write a few thoughts first so Mindo can organize them.");
      setItems([]);
      return;
    }

    if (!parsed.length) {
      setError("We couldn't detect any clear action items. Try a list of tasks or ideas instead.");
      setItems([]);
      return;
    }

    setError("");
    setSuccess("");
    setItems(parsed);
  };

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    const selectedItems = items.filter((item) => item.selected && item.title.trim());

    if (!selectedItems.length) {
      setError("Choose at least one item to save.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const existingTaskKeys = new Set(
        tasks.map((task) => buildDuplicateKey(task.title || "", normalizeDateValue(task.dueDate || "")))
      );
      const existingGroceryKeys = new Set(
        grocery.map((item) => `${(item.name || "").trim().toLowerCase()}::${(item.quantity || "").trim().toLowerCase()}::${(item.bucketLabel || "").trim().toLowerCase()}`)
      );

      const savedTaskCount = { value: 0 };
      const savedGroceryCount = { value: 0 };

      for (const item of selectedItems) {
        const safeTitle = item.title.trim();

        if (item.type === "grocery") {
          const key = `${safeTitle.toLowerCase()}::${(item.quantity || "").toLowerCase()}::${(item.bucketLabel || "").toLowerCase()}`;
          if (existingGroceryKeys.has(key)) continue;

          await dispatch(
            addItemFirestore({
              name: safeTitle,
              quantity: item.quantity || "",
              bucketLabel: item.bucketLabel || (item.listType === "monthly" ? "This Month" : "This Week"),
              listType: item.listType || "weekly",
              completed: false,
            })
          );

          existingGroceryKeys.add(key);
          savedGroceryCount.value += 1;
          continue;
        }

        const itemKey = buildDuplicateKey(safeTitle, item.dueDate || "");
        if (existingTaskKeys.has(itemKey)) continue;

        await dispatch(
          addTaskFirestore({
            title: safeTitle,
            note: "",
            dueDate: item.dueDate || null,
            priority: item.priority || "None",
            category: item.category || "Reminders",
            repeat: "Never",
            organization: "",
            placesPeople: "",
            locationType: "none",
            locationReminder: false,
            locationName: "",
            completed: false,
          })
        );

        existingTaskKeys.add(itemKey);
        savedTaskCount.value += 1;
      }

      setDraft("");
      setItems([]);

      const summaryParts = [];
      if (savedTaskCount.value > 0) summaryParts.push(`${savedTaskCount.value} task${savedTaskCount.value > 1 ? "s" : ""}`);
      if (savedGroceryCount.value > 0) summaryParts.push(`${savedGroceryCount.value} grocery item${savedGroceryCount.value > 1 ? "s" : ""}`);

      setSuccess(
        summaryParts.length
          ? `Saved ${summaryParts.join(" and ")}.`
          : "Your selections were already saved or duplicated, so nothing new was added."
      );

      await dispatch(fetchTasksFirestore());
      await dispatch(fetchGroceryFirestore());
    } catch (err) {
      console.error("Brain dump save failed:", err);
      setError(err?.message || "Something went wrong while saving your items.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in-up flex flex-col gap-6 min-h-[calc(100vh-6rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">Brain Dump</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">What&apos;s on your mind?</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Sparkles className="w-4 h-4" />
          Organize fast
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-[#121214]/80">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Buy milk and call the doctor tomorrow. Finish React project and buy eggs."
          className="min-h-[180px] w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-700 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-slate-200"
        />

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mindo will split grocery items and tasks before saving.
          </p>
          <button
            type="button"
            onClick={handleOrganize}
            disabled={loading || !draft.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? "Organizing..." : "Organize My Thoughts"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800/80 dark:bg-[#121214]/80">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Review your ideas</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose what should become a task and what should go to Grocery.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {selectedItemsCount}/{items.length} selected
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#1a1a1e]">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(event) => updateItem(item.id, "selected", event.target.checked)}
                    className="mt-2 h-4 w-4 accent-indigo-600"
                  />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        value={item.title}
                        onChange={(event) => updateItem(item.id, "title", event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-100"
                      />
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${item.type === "grocery" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"}`}>
                        {item.type === "grocery" ? "Grocery" : "Task"}
                      </span>
                    </div>

                    {item.type === "grocery" ? (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          value={item.quantity || ""}
                          placeholder="Qty (optional)"
                          onChange={(event) => updateItem(item.id, "quantity", event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                        />
                        <input
                          value={item.bucketLabel || ""}
                          placeholder="Bucket"
                          onChange={(event) => updateItem(item.id, "bucketLabel", event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                        />
                        <select
                          value={item.listType || "weekly"}
                          onChange={(event) => updateItem(item.id, "listType", event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-3">
                        <select
                          value={item.category || "Reminders"}
                          onChange={(event) => updateItem(item.id, "category", event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                        >
                          <option value="Reminders">Reminders</option>
                          <option value="Work">Work</option>
                          <option value="Personal">Personal</option>
                          <option value="Grocery">Grocery</option>
                        </select>

                        <select
                          value={item.priority || "None"}
                          onChange={(event) => updateItem(item.id, "priority", event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="None">None</option>
                        </select>

                        <input
                          value={item.dueDate || ""}
                          type="date"
                          onChange={(event) => updateItem(item.id, "dueDate", event.target.value)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {selectedItemsCount > 0 ? `${selectedItemsCount} item${selectedItemsCount > 1 ? "s" : ""} ready to save.` : "Select items to save."}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedItemsCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save to Mindo"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

