import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Check,
  X,
  Plus,
  AlertCircle,
  Clock,
  DollarSign,
  Utensils,
  ShoppingCart,
  Activity,
  Bell,
  FileText,
  CheckSquare,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { parseUniversalCommand } from "../services/commandParserService";
import { addTaskFirestore } from "../redux/tasksSlice";
import { addExpenseFirestore } from "../redux/expensesSlice";
import { addItemFirestore } from "../redux/grocerySlice";
import { addMealFirestore, updateMealFirestore, getStartOfWeek } from "../redux/mealsSlice";
import { addHabitFirestore, toggleHabitCompletion } from "../redux/habitsSlice";
import { addNoteFirestore } from "../redux/notesSlice";
import { createReminderRecord, addReminderRecord, addNotification } from "../utils/notifications";
import { formatDue } from "../utils/dateUtils";

const MODULE_TAGS = {
  expense: { label: "Expense", icon: DollarSign, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
  income: { label: "Income", icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  meal: { label: "Meal Plan", icon: Utensils, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  grocery: { label: "Grocery", icon: ShoppingCart, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800" },
  habit: { label: "Habit", icon: Activity, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  reminder: { label: "Reminder", icon: Bell, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  note: { label: "Note", icon: FileText, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
  task: { label: "Task", icon: CheckSquare, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  ambiguous: { label: "Clarification Needed", icon: HelpCircle, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
};

const SAMPLE_PROMPTS = [
  { label: "Expense", text: "I spent AED 45 at Nesto today" },
  { label: "Income", text: "Salary AED 9000 received today" },
  { label: "Meal", text: "Add chicken biryani for Friday dinner" },
  { label: "Grocery", text: "Add milk, bread and eggs to my grocery list" },
  { label: "Habit", text: "I walked for 30 minutes today" },
  { label: "Reminder", text: "Remind me to call Mom tomorrow at 6 PM" },
  { label: "Note", text: "Remember that Eva likes avocado" },
];

export default function UniversalCommandCenter({ compact = false, onSaveSuccess }) {
  const dispatch = useDispatch();

  const tasks = useSelector((state) => state.tasks || []);
  const grocery = useSelector((state) => state.grocery || []);
  const habitsState = useSelector((state) => state.habits || {});
  const meals = useSelector((state) => state.meals || []);
  const expenses = useSelector((state) => state.expenses || []);
  const notes = useSelector((state) => state.notes || []);

  const [commandText, setCommandText] = useState("");
  const [parsedResults, setParsedResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  // Voice Hook
  const {
    isListening,
    error: voiceError,
    isSupported: voiceSupported,
    toggleListening,
    stopListening,
    setError: setVoiceError,
  } = useVoiceInput({
    onTranscript: (text) => {
      setCommandText(text);
    },
  });

  const handleMicClick = () => {
    if (statusMessage) setStatusMessage(null);
    toggleListening();
  };

  const handleParse = (e) => {
    if (e) e.preventDefault();
    const raw = commandText.trim();
    if (!raw) return;

    if (isListening) stopListening();

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { id: `u-${Date.now()}`, role: "user", text: raw, time: nowTime };
    setChatHistory((prev) => [...prev, userMsg].slice(-15));

    const results = parseUniversalCommand(raw, {
      habits: habitsState.habits || [],
      completions: habitsState.completions || [],
      tasks,
      grocery,
      meals,
      expenses,
      notes,
    });

    if (!results || results.length === 0) {
      const errorMsg = { id: `a-${Date.now()}`, role: "assistant", text: "I'm not sure what you want to add or ask. Try rephrasing your request.", time: nowTime };
      setChatHistory((prev) => [...prev, errorMsg].slice(-15));
      setStatusMessage({ type: "error", text: "I'm not sure what you want to add or ask. Try rephrasing your request." });
      return;
    }

    // Handle READ queries vs WRITE actions
    const queries = results.filter((r) => r.type === "query");
    const actions = results.filter((r) => r.type !== "query");

    if (queries.length > 0) {
      const combinedAnswer = queries.map((q) => q.answer).join("\n\n");
      const assistantMsg = { id: `a-${Date.now()}`, role: "assistant", text: combinedAnswer, time: nowTime };
      setChatHistory((prev) => [...prev, assistantMsg].slice(-15));
      setCommandText("");
    }

    setParsedResults(actions);
    setStatusMessage(null);
  };

  const handleResolveAmbiguity = (ambiguousIndex, selectedOption) => {
    setParsedResults((prev) => {
      const copy = [...prev];
      copy[ambiguousIndex] = selectedOption.parsed;
      return copy;
    });
  };

  const handleSaveAll = async () => {
    if (!parsedResults.length) return;

    setIsProcessing(true);
    setStatusMessage(null);

    let savedCount = 0;
    const summaryParts = [];

    try {
      for (const item of parsedResults) {
        if (item.type === "ambiguous") continue;

        const { entities } = item;

        switch (item.type) {
          case "expense":
          case "income": {
            await dispatch(
              addExpenseFirestore({
                type: entities.type || "expense",
                title: entities.title || "Transaction",
                amount: entities.amount || 0,
                category: entities.category || "Other",
                date: entities.date || new Date().toISOString().slice(0, 10),
                paymentMethod: entities.paymentMethod || "Card / Cash",
                note: entities.note || "",
              })
            );
            summaryParts.push(entities.type === "income" ? "Income" : "Expense");
            savedCount++;
            break;
          }

          case "meal": {
            const targetDay = entities.day || "Monday";
            const targetType = (entities.mealType || "dinner").toLowerCase();
            const weekStart = entities.dateStr || getStartOfWeek();

            const existingMeal = (meals || []).find(
              (m) =>
                (m.day || "").toLowerCase() === targetDay.toLowerCase() &&
                (m.type || "").toLowerCase() === targetType &&
                (!m.dateStr || m.dateStr === weekStart)
            );

            const payload = {
              name: entities.mealName || "Meal",
              type: targetType,
              day: targetDay,
              dateStr: weekStart,
              notes: entities.notes || "",
              ingredients: entities.ingredients || [],
            };

            if (existingMeal) {
              await dispatch(updateMealFirestore({ ...payload, id: existingMeal.id }));
              summaryParts.push(`Updated ${targetDay} ${targetType} to "${payload.name}"`);
            } else {
              await dispatch(addMealFirestore(payload));
              summaryParts.push(`Added "${payload.name}" for ${targetDay} ${targetType}`);
            }
            savedCount++;
            break;
          }

          case "grocery": {
            const list = entities.items || ["Grocery Item"];
            for (const name of list) {
              await dispatch(
                addItemFirestore({
                  name,
                  quantity: "",
                  bucketLabel: entities.bucketLabel || "This Week",
                  listType: entities.listType || "weekly",
                  completed: false,
                })
              );
            }
            summaryParts.push(`${list.length} Grocery item${list.length > 1 ? "s" : ""}`);
            savedCount++;
            break;
          }

          case "habit": {
            if (entities.isExisting && entities.habitId) {
              await dispatch(
                toggleHabitCompletion({
                  habitId: entities.habitId,
                  date: entities.date || new Date().toISOString().slice(0, 10),
                })
              );
              summaryParts.push(`Completed habit "${entities.habitName}"`);
            } else {
              await dispatch(
                addHabitFirestore({
                  name: entities.habitName || "Daily Habit",
                  icon: "🎯",
                  frequency: "daily",
                  target: "",
                })
              );
              summaryParts.push(`New Habit "${entities.habitName}"`);
            }
            savedCount++;
            break;
          }

          case "reminder": {
            const record = createReminderRecord({
              title: entities.title || "Reminder",
              date: entities.date || new Date().toISOString().slice(0, 10),
              time: entities.time || "09:00",
              notes: entities.notes || entities.title,
              repeat: "Never",
              relatedType: "reminder",
              route: "/tasks",
            });
            addReminderRecord(record);
            addNotification({
              title: "Reminder saved",
              message: `${record.title} for ${record.date} at ${record.time}`,
              type: "reminder",
              relatedItemType: "reminder",
              relatedItemId: record.id,
              scheduledAt: record.scheduledAt,
              route: "/tasks",
            });
            summaryParts.push(`Reminder (${entities.title})`);
            savedCount++;
            break;
          }

          case "note": {
            await dispatch(
              addNoteFirestore({
                heading: entities.heading || "Note",
                description: entities.description || "",
                attachments: [],
              })
            );
            summaryParts.push(`Note (${entities.heading})`);
            savedCount++;
            break;
          }

          case "task":
          default: {
            await dispatch(
              addTaskFirestore({
                title: entities.title || "Task",
                note: "",
                dueDate: entities.dueDate || null,
                priority: entities.priority || "Medium",
                category: entities.category || "Personal",
                repeat: "Never",
                completed: false,
              })
            );
            summaryParts.push(`Task (${entities.title})`);
            savedCount++;
            break;
          }
        }
      }

      const successText = `Saved to Mindo: ${summaryParts.join(", ")}.`;
      setStatusMessage({
        type: "success",
        text: successText,
      });

      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatHistory((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: successText, time: nowTime },
      ].slice(-15));

      setCommandText("");
      setParsedResults([]);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error("Universal save failed:", err);
      setStatusMessage({ type: "error", text: "Failed to save item. Please try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Command Input Box */}
      <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/90 shadow-md backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#121214]/90 ${compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5"}`}>
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Command Center</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">Tell Mindo what you want to add</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/20 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 dark:bg-rose-400"></span>
                Listening...
              </div>
            )}

            {compact && (
              <a
                href="/command-center"
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                Full chat &rarr;
              </a>
            )}
          </div>
        </div>

        {/* Text Area & Mic / Submit Controls */}
        <form onSubmit={handleParse} className="relative">
          <textarea
            value={commandText}
            onChange={(e) => {
              setCommandText(e.target.value);
              if (statusMessage) setStatusMessage(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleParse();
              }
            }}
            rows={compact ? 1 : 3}
            placeholder="Tell Mindo what you need... (e.g. Spent 45 at Nesto, Add chicken biryani for Friday dinner, Walked 30 mins)"
            className={`w-full resize-none rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#19191c]/80 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-[#19191c] ${compact ? "py-2.5 pr-20" : "py-3.5 pr-24"}`}
          />

          <div className={`absolute right-2 flex items-center gap-1 ${compact ? "bottom-2" : "bottom-3"}`}>
            {/* Microphone Button */}
            <button
              type="button"
              onClick={handleMicClick}
              title={isListening ? "Stop voice input" : "Use voice input"}
              aria-label={isListening ? "Stop voice input" : "Use voice input"}
              className={`flex items-center justify-center rounded-lg transition ${compact ? "h-7 w-7" : "h-9 w-9 rounded-xl"} ${
                isListening
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse"
                  : "bg-slate-200/80 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!commandText.trim()}
              title="Parse & Review"
              className={`flex items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed ${compact ? "h-7 w-7" : "h-9 w-9 rounded-xl"}`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mr-0.5">Try:</span>
          {SAMPLE_PROMPTS.slice(0, compact ? 4 : SAMPLE_PROMPTS.length).map((prompt) => (
            <button
              key={prompt.label}
              type="button"
              onClick={() => {
                setCommandText(prompt.text);
                if (statusMessage) setStatusMessage(null);
              }}
              className="rounded-lg border border-slate-200/80 bg-slate-100/60 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-800 dark:bg-[#1a1a1d] dark:text-slate-400 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-300"
            >
              {prompt.label}
            </button>
          ))}
        </div>

        {/* Voice Errors */}
        {voiceError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{voiceError}</span>
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="ml-auto text-rose-400 hover:text-rose-600 dark:hover:text-rose-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* General Status Messages */}
        {statusMessage && (
          <div
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3 sm:px-4 py-2.5 text-xs font-medium ${
              statusMessage.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="ml-auto opacity-70 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Review Before Saving Card */}
      {parsedResults.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-indigo-200/80 bg-white p-4 shadow-xl dark:border-indigo-900/40 dark:bg-[#121215] sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">I understood:</h3>
              <span className="text-xs text-slate-400">({parsedResults.length} item{parsedResults.length > 1 ? "s" : ""})</span>
            </div>
            <button
              type="button"
              onClick={() => setParsedResults([])}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Discard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            {parsedResults.map((res, index) => {
              if (res.type === "ambiguous") {
                return (
                  <div
                    key={`amb-${index}`}
                    className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Which destination did you mean?
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {res.ambiguousOptions.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() => handleResolveAmbiguity(index, opt)}
                          className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 dark:border-amber-700 dark:bg-[#1a1714] dark:text-amber-200 dark:hover:bg-amber-900/40"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              const tagInfo = MODULE_TAGS[res.type] || MODULE_TAGS.task;
              const TagIcon = tagInfo.icon;
              const { entities } = res;

              return (
                <div
                  key={`res-${index}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800/80 dark:bg-[#17171a]/70"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tagInfo.color}`}
                    >
                      <TagIcon className="h-4 w-4" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagInfo.color}`}
                        >
                          {tagInfo.label}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {entities.title || entities.mealName || entities.habitName || entities.heading || (entities.items && entities.items.join(", ")) || "Item"}
                        </h4>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {entities.amount !== undefined && (
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            AED {entities.amount}
                          </span>
                        )}
                        {entities.category && <span>Category: {entities.category}</span>}
                        {entities.mealType && <span>Type: {entities.mealType}</span>}
                        {entities.dateLabel && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entities.dateLabel}
                          </span>
                        )}
                        {entities.time && <span>Time: {entities.time}</span>}
                        {entities.priority && (
                          <span
                            className={
                              entities.priority === "High" ? "text-rose-500 font-semibold" : ""
                            }
                          >
                            Priority: {entities.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setParsedResults((prev) => prev.filter((_, idx) => idx !== index));
                    }}
                    className="self-end sm:self-center rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Remove item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setParsedResults([])}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isProcessing || parsedResults.some((r) => r.type === "ambiguous")}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              {isProcessing ? "Saving..." : "Confirm & Save"}
            </button>
          </div>
        </div>
      )}

      {/* Chat History */}
      {chatHistory.length > 0 && (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#121214]/90 sm:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Chat History
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setChatHistory([])}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear Chat History
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-medium ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "border border-slate-200/80 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-[#18181c] dark:text-slate-200"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="mt-0.5 text-[9px] text-slate-400 px-1">
                  {msg.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
