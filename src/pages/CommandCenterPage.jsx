import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTasksFirestore, addTaskFirestore } from "../redux/tasksSlice";
import { addItemFirestore, fetchGroceryFirestore } from "../redux/grocerySlice";
import { ArrowLeft, Check, Send, Sparkles, X } from "lucide-react";
import { buildDuplicateKey } from "../utils/brainDump";
import { detectIntent, generateIntentResponse, generateCasualReply } from "../utils/mindoIntent";
import { addNotification, addReminderRecord, createReminderRecord, parseReminderText } from "../utils/notifications";
import { formatDue } from "../utils/dateUtils";

export default function CommandCenterPage() {
  const dispatch = useDispatch();
  const tasks = useSelector((state) => state.tasks || []);
  const grocery = useSelector((state) => state.grocery || []);

  const [commandText, setCommandText] = useState("");
  const [commandItems, setCommandItems] = useState([]);
  const [commandError, setCommandError] = useState("");
  const [commandSuccess, setCommandSuccess] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [conversation, setConversation] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [sessionContext, setSessionContext] = useState({
    recentItems: [],
    lastActionItem: null,
    recentMessages: [],
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    dispatch(fetchTasksFirestore());
    dispatch(fetchGroceryFirestore());
  }, [dispatch]);

  const addConversationMessage = (role, text) => {
    setConversation((current) => [
      ...current,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        text,
      },
    ].slice(-10));
  };

  const handleCommandSubmit = async () => {
    const raw = commandText.trim();
    if (!raw) {
      setCommandError("Write a thought, task, or grocery item first.");
      return;
    }

    setConversation((current) => [...current, { id: `user-${Date.now()}`, role: "user", text: raw }].slice(-10));

    const intent = detectIntent(raw, sessionContext, { tasks, grocery });

    if (intent.intent === "CASUAL_CONVERSATION") {
      const response = generateCasualReply(raw);
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      setSessionContext((current) => ({ ...current, recentMessages: [...current.recentMessages, raw].slice(-6) }));
      return;
    }

    if (intent.intent === "REMINDER_CREATE") {
      const reminder = intent.parameters?.reminder || parseReminderText(raw) || { title: raw, date: new Date().toISOString().slice(0, 10), time: "09:00", notes: raw };
      const record = createReminderRecord({
        title: reminder.title || "Reminder",
        date: reminder.date,
        time: reminder.time || "09:00",
        notes: reminder.notes || raw,
        repeat: reminder.repeat || "Never",
        relatedType: "reminder",
        relatedId: null,
        route: "/tasks",
      });

      addReminderRecord(record);
      addNotification({
        title: "Reminder saved",
        message: `${record.title} is scheduled for ${record.scheduledAt ? new Date(record.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "later"}.`,
        type: "reminder",
        relatedItemType: "reminder",
        relatedItemId: record.id,
        scheduledAt: record.scheduledAt,
        route: "/tasks",
      });

      const response = `Reminder saved for ${record.title}.`;
      setAiResponse(response);
      addConversationMessage("assistant", response);
      setCommandItems([]);
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      return;
    }

    if (intent.intent === "GENERAL_PRODUCTIVITY" && !intent.action) {
      const fallback = "I’m not fully sure what you want to do. Do you want to check your tasks, review groceries, or add something new?";
      setAiResponse(fallback);
      addConversationMessage("assistant", fallback);
      setCommandItems([]);
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      return;
    }

    if (intent.intent === "GROCERY_CREATE" || intent.intent === "TASK_CREATE" || intent.intent === "BRAIN_DUMP") {
      const items = intent.parameters?.items || intent.action?.items || [];
      const normalizedItems = (items || []).map((item, index) => ({
        id: `${item.type}-${item.title || item.name || "item"}-${index}`,
        title: item.title || item.name || "Untitled item",
        name: item.name || item.title || "Untitled item",
        type: item.type || (item.name ? "grocery" : "task"),
        quantity: item.quantity || "",
        bucketLabel: item.bucketLabel || item.listType || "This Week",
        dueDate: item.dueDate || null,
        selected: true,
      }));

      if (!normalizedItems.length) {
        const fallbackResponse = "I could not confidently identify a task or grocery item in that message. Try a more specific request.";
        setAiResponse(fallbackResponse);
        addConversationMessage("assistant", fallbackResponse);
        setCommandError("");
        setCommandText("");
        return;
      }

      setCommandItems(normalizedItems);
      setAiResponse("I found a few relevant items. Review and choose what to save.");
      addConversationMessage("assistant", "I found a few relevant items. Review and choose what to save.");
      setSessionContext((current) => ({ ...current, recentItems: normalizedItems.slice(0, 4).map((item) => item.title), lastActionItem: normalizedItems[0]?.title || null }));
      setCommandError("");
      setCommandSuccess("");
      setCommandText("");
      return;
    }

    const response = generateIntentResponse(intent.intent, { tasks, grocery, rawInput: raw });
    setAiResponse(response);
    addConversationMessage("assistant", response);
    setCommandItems([]);
    setCommandError("");
    setCommandSuccess("");
    setCommandText("");
  };

  const confirmBulkSave = () => {
    if (!confirmAction) return;
    setCommandItems((current) => current.map((item) => item.id === confirmAction.id ? { ...item, selected: true } : item));
    setConfirmAction(null);
  };

  const saveCommandItems = async () => {
    const selected = commandItems.filter((item) => item.selected && (item.title || item.name)?.trim());
    if (!selected.length) {
      setCommandError("Select at least one item to save.");
      return;
    }

    if (selected.length > 2) {
      setConfirmAction({ id: "bulk-save", count: selected.length });
      return;
    }

    setIsProcessing(true);
    setCommandError("");
    setCommandSuccess("");

    try {
      const existingTaskKeys = new Set(tasks.map((task) => buildDuplicateKey(task.title || "", task.dueDate || "")));
      const existingGroceryKeys = new Set(grocery.map((item) => `${(item.name || "").trim().toLowerCase()}::${(item.quantity || "").trim().toLowerCase()}::${(item.bucketLabel || "").trim().toLowerCase()}`));

      let tasksSaved = 0;
      let groceriesSaved = 0;

      for (const item of selected) {
        const title = (item.title || item.name || "").trim();
        if (!title) continue;

        if (item.type === "grocery") {
          const key = `${title.toLowerCase()}::${(item.quantity || "").toLowerCase()}::${(item.bucketLabel || "").toLowerCase()}`;
          if (existingGroceryKeys.has(key)) continue;

          await dispatch(addItemFirestore({
            name: title,
            quantity: item.quantity || "",
            bucketLabel: item.bucketLabel || "This Week",
            listType: item.bucketLabel === "This Month" ? "monthly" : "weekly",
            completed: false,
          }));

          existingGroceryKeys.add(key);
          groceriesSaved += 1;
          continue;
        }

        const taskKey = buildDuplicateKey(title, item.dueDate || "");
        if (existingTaskKeys.has(taskKey)) continue;

        await dispatch(addTaskFirestore({
          title,
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
        }));

        existingTaskKeys.add(taskKey);
        tasksSaved += 1;
      }

      const summary = [];
      if (tasksSaved) summary.push(`${tasksSaved} task${tasksSaved > 1 ? "s" : ""}`);
      if (groceriesSaved) summary.push(`${groceriesSaved} grocery item${groceriesSaved > 1 ? "s" : ""}`);

      const finalMessage = summary.length ? `Saved ${summary.join(" and ")}.` : "Nothing new was added.";
      setCommandSuccess(finalMessage);
      addConversationMessage("assistant", finalMessage);
      setSessionContext((current) => ({
        ...current,
        recentItems: selected.slice(0, 4).map((item) => item.title || item.name),
        lastActionItem: selected[0]?.title || selected[0]?.name || null,
      }));
      setCommandText("");
      setCommandItems([]);
      setAiResponse("");
      setConfirmAction(null);
    } catch (error) {
      console.error("Command save failed:", error);
      setCommandError("I couldn't save that right now. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-[#0b0b0d] md:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214]">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
                Confirm action
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Are you sure?</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                This will add {confirmAction.count} item{confirmAction.count > 1 ? "s" : ""} to your Mindo data.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBulkSave}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#121214] dark:text-slate-200 dark:hover:bg-[#19191d]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-[#121214]/80 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Command center</p>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Talk to Mindo naturally</h1>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#1a1a1e]">
            <textarea
              value={commandText}
              onChange={(event) => setCommandText(event.target.value)}
              rows={5}
              placeholder="Example: Add milk to my grocery list, or plan my day, or call the doctor tomorrow."
              className="w-full resize-none border-0 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            />

            <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Natural requests, real Mindo actions, no special commands required.
              </div>
              <button
                type="button"
                onClick={handleCommandSubmit}
                disabled={isProcessing || !commandText.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>

          {commandError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {commandError}
            </div>
          )}

          {commandSuccess && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              {commandSuccess}
            </div>
          )}

          {aiResponse && (
            <div className="mt-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm text-indigo-900 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
              {aiResponse}
            </div>
          )}
        </div>

        {commandItems.length > 0 && (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-[#121214]/80">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review items</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Choose what to save to your existing Mindo data.</p>
              </div>
              <button
                type="button"
                onClick={() => setCommandItems([])}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close review"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {commandItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#1a1a1e]">
                  <input
                    type="checkbox"
                    checked={Boolean(item.selected)}
                    onChange={() => setCommandItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, selected: !entry.selected } : entry))}
                    className="h-4 w-4 accent-indigo-600"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        {item.type === "grocery" ? "Grocery" : "Task"}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</span>
                    </div>
                    {(item.quantity || item.bucketLabel || item.dueDate) && (
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.quantity ? item.quantity : null}
                        {item.quantity && item.bucketLabel ? " • " : ""}
                        {item.bucketLabel ? item.bucketLabel : null}
                        {item.dueDate ? ` • ${formatDue(item.dueDate)}` : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCommandItems((current) => current.map((item) => ({ ...item, selected: false })))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={saveCommandItems}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                {isProcessing ? "Saving..." : "Add selected"}
              </button>
            </div>
          </div>
        )}

        {conversation.length > 0 && (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-[#121214]/80">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Session history
            </div>
            <div className="space-y-2">
              {conversation.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "ml-auto max-w-[85%] bg-indigo-600 text-white"
                      : "mr-auto max-w-[90%] border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#141417] dark:text-slate-200"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
