import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  MessageSquareText,
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
  Trash2,
  Loader2,
} from "lucide-react";
import samAvatar from "../assets/sam-avatar.png";
import { useVoiceInput } from "../hooks/useVoiceInput";
import { processSamQuery } from "../services/samService";
import {
  getOrCreateConversation,
  fetchConversationMessages,
  saveMessage,
  clearSamChat,
} from "../services/samChatService";
import { addTaskFirestore, deleteTaskFirestore, toggleTaskFirestore } from "../redux/tasksSlice";
import { addExpenseFirestore, deleteExpenseFirestore } from "../redux/expensesSlice";
import { addItemFirestore, deleteItemFirestore } from "../redux/grocerySlice";
import { addMealFirestore, updateMealFirestore, deleteMealFirestore } from "../redux/mealsSlice";
import { addHabitFirestore, toggleHabitCompletion, deleteHabitFirestore } from "../redux/habitsSlice";
import { addNoteFirestore, deleteNoteFirestore } from "../redux/notesSlice";
import { createReminderRecord, addReminderRecord, addNotification, readReminders } from "../utils/notifications";
import { isSameCalendarDate, getWeekdayName, getStartOfWeek } from "../utils/dateUtils";
import {
  getFallbackTasks,
  getFallbackGrocery,
  getFallbackNotes,
  getFallbackExpenses,
  getFallbackMeals,
  getFallbackHabits,
  getFallbackReminders,
} from "../services/mindoDataReader";

const MODULE_TAGS = {
  expense: { label: "Expense", icon: DollarSign, color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800" },
  income: { label: "Income", icon: DollarSign, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  meal: { label: "Meal Plan", icon: Utensils, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  grocery: { label: "Grocery", icon: ShoppingCart, color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800" },
  habit: { label: "Habit", icon: Activity, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  reminder: { label: "Reminder", icon: Bell, color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  note: { label: "Note", icon: FileText, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800" },
  task: { label: "Task", icon: CheckSquare, color: "bg-[#703ceb]/10 text-[#703ceb] dark:text-[#a782f7] border-[#703ceb]/20 dark:border-[#703ceb]/30" },
  ambiguous: { label: "Clarification Needed", icon: HelpCircle, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
};

export default function UniversalCommandCenter({ compact = false, onSaveSuccess }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const tasks = useSelector((state) => state.tasks || []);
  const grocery = useSelector((state) => state.grocery || []);
  const habitsState = useSelector((state) => state.habits || {});
  const meals = useSelector((state) => state.meals || []);
  const expenses = useSelector((state) => state.expenses || []);
  const notes = useSelector((state) => state.notes || []);

  const [commandText, setCommandText] = useState("");
  const [parsedResults, setParsedResults] = useState([]);
  const [confirmationPromptText, setConfirmationPromptText] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [statusMessage, setStatusMessage] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load Sam Conversation & History on Mount
  useEffect(() => {
    let active = true;

    const loadSamHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const conv = await getOrCreateConversation();
        if (!active) return;

        if (conv?.id) {
          setConversationId(conv.id);
          const msgs = await fetchConversationMessages(conv.id);
          if (!active) return;
          setChatHistory(msgs);
        }
      } catch (err) {
        console.error("Failed to load Sam chat history:", err);
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    };

    loadSamHistory();

    return () => {
      active = false;
    };
  }, []);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (!compact && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, parsedResults, statusMessage, isProcessing, compact]);

  // Voice Hook
  const {
    isListening,
    error: voiceError,
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

  const handleParseText = async (rawText) => {
    const raw = (rawText || commandText).trim();
    if (!raw || isProcessing) return;

    if (isListening) stopListening();

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = { id: `u-${Date.now()}`, role: "user", text: raw, time: nowTime };

    setChatHistory((prev) => [...prev, userMsg]);
    setCommandText("");
    setStatusMessage(null);
    setIsProcessing(true);

    // Save user message to Supabase / LocalStorage
    saveMessage({
      conversationId,
      role: "user",
      content: raw,
    }).then((saved) => {
      if (saved?.id) {
        setChatHistory((prev) =>
          prev.map((msg) => (msg.id === userMsg.id ? { ...msg, id: saved.id } : msg))
        );
      }
    });

    try {
      const result = await processSamQuery({
        message: raw,
        chatHistory: [...chatHistory, userMsg],
        contextData: {
          tasks: getFallbackTasks(tasks),
          grocery: getFallbackGrocery(grocery),
          habits: getFallbackHabits(habitsState),
          meals: getFallbackMeals(meals),
          expenses: getFallbackExpenses(expenses),
          notes: getFallbackNotes(notes),
          reminders: getFallbackReminders(readReminders()),
        },
      });

      if (!result) {
        setIsProcessing(false);
        return;
      }

      const assistantTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const assistantText = result.replyText || "Done!";

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: assistantText,
        time: assistantTime,
      };

      setChatHistory((prev) => [...prev, assistantMsg]);

      // Save assistant response to Supabase / LocalStorage
      saveMessage({
        conversationId,
        role: "assistant",
        content: assistantText,
        intentType: result.intentType,
        actions: result.actions || [],
      }).then((saved) => {
        if (saved?.id) {
          setChatHistory((prev) =>
            prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, id: saved.id } : msg))
          );
        }
      });

      if (result.actions && result.actions.length > 0) {
        const formattedActions = result.actions.map((act) => {
          let moduleType = "task";
          const t = (act.type || "").toLowerCase();
          if (t.includes("expense") || t.includes("income")) moduleType = "expense";
          else if (t.includes("meal")) moduleType = "meal";
          else if (t.includes("grocery")) moduleType = "grocery";
          else if (t.includes("habit")) moduleType = "habit";
          else if (t.includes("note")) moduleType = "note";
          else if (t.includes("reminder")) moduleType = "reminder";

          return {
            type: moduleType,
            actionType: act.type,
            entities: act.entities || {},
            rawAction: act,
          };
        });

        setParsedResults(formattedActions);
        setConfirmationPromptText(result.confirmationPrompt || null);
      } else {
        setParsedResults([]);
        setConfirmationPromptText(null);
      }
    } catch (err) {
      console.error("Error processing Sam query:", err);
      const errorText = "Sorry, I couldn't process that right now. Please try again.";
      const errorMsg = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: errorText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatHistory((prev) => [...prev, errorMsg]);
      saveMessage({
        conversationId,
        role: "assistant",
        content: errorText,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFormSubmit = (e) => {
    if (e) e.preventDefault();
    handleParseText(commandText);
  };

  const handleResolveAmbiguity = (ambiguousIndex, selectedOption) => {
    setParsedResults((prev) => {
      const copy = [...prev];
      copy[ambiguousIndex] = selectedOption;
      return copy;
    });
  };

  const handleClearChat = async () => {
    await clearSamChat(conversationId);
    setChatHistory([]);
    setParsedResults([]);
    setConfirmationPromptText(null);
    setStatusMessage(null);
  };

  const handleSaveAll = async () => {
    if (!parsedResults.length || isProcessing) return;

    setIsProcessing(true);
    setStatusMessage(null);

    let savedCount = 0;
    const summaryParts = [];

    try {
      for (const item of parsedResults) {
        if (item.type === "ambiguous") continue;

        const { actionType, entities } = item;

        switch (actionType) {
          case "DELETE_TASK": {
            if (entities.targetId) {
              await dispatch(deleteTaskFirestore(entities.targetId));
            } else if (entities.title) {
              const match = tasks.find((t) => (t.title || "").toLowerCase().includes(entities.title.toLowerCase()));
              if (match) await dispatch(deleteTaskFirestore(match.id));
            }
            summaryParts.push(`Deleted Task (${entities.title || "item"})`);
            savedCount++;
            break;
          }

          case "COMPLETE_TASK": {
            const match = tasks.find((t) => (t.title || "").toLowerCase().includes((entities.title || "").toLowerCase()));
            if (match) {
              await dispatch(toggleTaskFirestore(match));
              summaryParts.push(`Completed Task "${match.title}"`);
              savedCount++;
            }
            break;
          }

          case "DELETE_GROCERY": {
            if (entities.targetId) {
              await dispatch(deleteItemFirestore(entities.targetId));
            } else if (entities.name) {
              const match = grocery.find((g) => (g.name || "").toLowerCase().includes(entities.name.toLowerCase()));
              if (match) await dispatch(deleteItemFirestore(match.id));
            }
            summaryParts.push(`Removed Grocery (${entities.name || "item"})`);
            savedCount++;
            break;
          }

          case "CREATE_EXPENSE": {
            await dispatch(
              addExpenseFirestore({
                type: entities.expenseType || "expense",
                title: entities.title || "Transaction",
                amount: entities.amount || 0,
                category: entities.category || "Other",
                date: entities.date || new Date().toISOString().slice(0, 10),
                paymentMethod: entities.paymentMethod || "Card / Cash",
                note: entities.description || "",
              })
            );
            summaryParts.push(`${entities.expenseType === "income" ? "Income" : "Expense"} (${entities.title || "Transaction"})`);
            savedCount++;
            break;
          }

          case "CREATE_MEAL":
          case "UPDATE_MEAL": {
            const dateVal = entities.dateStr || entities.date || new Date().toISOString().slice(0, 10);
            const targetDay = entities.day || getWeekdayName(dateVal);
            const targetType = (entities.mealType || entities.type || "dinner").toLowerCase();
            const weekStart = getStartOfWeek(dateVal);

            const existingMeal = (meals || []).find(
              (m) =>
                (m.day || "").toLowerCase() === targetDay.toLowerCase() &&
                (m.type || "").toLowerCase() === targetType &&
                (!m.dateStr || m.dateStr === weekStart || isSameCalendarDate(m.dateStr, dateVal) || isSameCalendarDate(m.dateStr, weekStart))
            );

            const payload = {
              name: entities.mealName || entities.name || "Meal",
              type: targetType,
              day: targetDay,
              dateStr: weekStart,
              notes: entities.notes || "",
              ingredients: entities.ingredients || [],
            };

            if (existingMeal) {
              await dispatch(updateMealFirestore({ ...payload, id: existingMeal.id }));
              summaryParts.push(`Updated ${targetDay} ${targetType} from "${existingMeal.name}" to "${payload.name}"`);
            } else {
              await dispatch(addMealFirestore(payload));
              summaryParts.push(`Meal "${payload.name}" for ${targetDay}`);
            }
            savedCount++;
            break;
          }

          case "CREATE_GROCERY": {
            const list = Array.isArray(entities.items) ? entities.items : [entities.name || entities.title || "Grocery Item"];
            for (const name of list) {
              await dispatch(
                addItemFirestore({
                  name,
                  quantity: entities.quantity || "",
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

          case "CREATE_HABIT": {
            await dispatch(
              addHabitFirestore({
                name: entities.habitName || entities.name || "Daily Habit",
                icon: "🎯",
                frequency: "daily",
                target: "",
              })
            );
            summaryParts.push(`New Habit "${entities.habitName || entities.name}"`);
            savedCount++;
            break;
          }

          case "TOGGLE_HABIT": {
            if (entities.habitId) {
              await dispatch(
                toggleHabitCompletion({
                  habitId: entities.habitId,
                  date: entities.date || new Date().toISOString().slice(0, 10),
                })
              );
              summaryParts.push(`Updated habit completion`);
              savedCount++;
            }
            break;
          }

          case "CREATE_REMINDER": {
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

          case "CREATE_NOTE": {
            await dispatch(
              addNoteFirestore({
                heading: entities.heading || entities.title || "Note",
                description: entities.description || "",
                attachments: [],
              })
            );
            summaryParts.push(`Note (${entities.heading || entities.title})`);
            savedCount++;
            break;
          }

          case "CREATE_TASK":
          default: {
            await dispatch(
              addTaskFirestore({
                title: entities.title || "Task",
                note: entities.description || "",
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

      const successText = summaryParts.length ? `Saved to Mindo: ${summaryParts.join(", ")}.` : "Completed action.";
      setStatusMessage({
        type: "success",
        text: successText,
      });

      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const confirmMsg = { id: `a-${Date.now()}`, role: "assistant", text: successText, time: nowTime };
      setChatHistory((prev) => [...prev, confirmMsg]);
      saveMessage({
        conversationId,
        role: "assistant",
        content: successText,
      });

      setCommandText("");
      setParsedResults([]);
      setConfirmationPromptText(null);
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error("Universal save failed:", err);
      setStatusMessage({ type: "error", text: "Failed to save item. Please try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // Render Compact Dashboard Bar View
  // -------------------------------------------------------------
  if (compact) {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#121214]/90">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden bg-[#703ceb] shadow-xs shrink-0">
                <img src={samAvatar} alt="Sam" className="h-full w-full object-cover" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Sam</h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Smart Action Manager</p>
              </div>
            </div>

            <a
              href="/sam"
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              Open Sam &rarr;
            </a>
          </div>

          <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              placeholder="Message Sam..."
              className="w-full rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2.5 pr-20 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-[#18181b]/90 dark:text-slate-100 dark:placeholder-slate-500"
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={handleMicClick}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-slate-200/70 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="submit"
                disabled={!commandText.trim() || isProcessing}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-40"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Dedicated ChatGPT-Inspired Chat Page View for Sam
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-[100dvh] lg:h-full min-h-0 w-full overflow-hidden bg-slate-50/50 dark:bg-[#0a0a0c]">
      {/* Top Header Bar - Fixed at top */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 sm:px-4 py-2 sm:py-2.5 pt-[max(0.6rem,env(safe-area-inset-top,0.6rem))] backdrop-blur-md dark:border-slate-800/80 dark:bg-[#121214]/95 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="lg:hidden flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80 shrink-0 cursor-pointer"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full overflow-hidden bg-[#703ceb] shadow-sm shrink-0">
            <img src={samAvatar} alt="Sam" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-none">Sam</h1>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" title="Online" />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Smart Action Manager
            </p>
          </div>
        </div>

        {chatHistory.length > 0 && (
          <button
            type="button"
            onClick={handleClearChat}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-rose-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-rose-400 cursor-pointer shrink-0"
            title="Clear Chat"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            <span className="text-xs">Clear Chat</span>
          </button>
        )}
      </div>

      {/* Main Chat Scrollable Messages Container */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3.5 sm:space-y-4 max-w-3xl mx-auto w-full no-scrollbar overscroll-contain">
        {/* Loading History State */}
        {isLoadingHistory && (
          <div className="my-auto flex flex-col items-center justify-center text-center py-16 space-y-3">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading conversation history...</p>
          </div>
        )}

        {/* Empty State Greeting */}
        {!isLoadingHistory && chatHistory.length === 0 && parsedResults.length === 0 && (
          <div className="my-auto flex flex-col items-center justify-center text-center py-12 sm:py-20 space-y-4 animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center rounded-full overflow-hidden bg-[#703ceb] shadow-lg shadow-[#703ceb]/25 ring-4 ring-[#703ceb]/20 shrink-0">
              <img src={samAvatar} alt="Sam" className="h-full w-full object-cover" />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Sam</h2>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">
                Smart Action Manager
              </p>
            </div>

            <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-200 max-w-md">
              Hi, I'm Sam. How can I help?
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Type or speak naturally. I automatically parse your intent and manage your tasks, groceries, meals, habits, expenses, notes & reminders.
            </p>
          </div>
        )}

        {/* Message Stream */}
        {!isLoadingHistory &&
          chatHistory.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isUser ? "justify-end" : "justify-start items-start gap-3"}`}
              >
                {!isUser && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[#703ceb] shadow-xs mt-0.5">
                    <img src={samAvatar} alt="Sam" className="h-full w-full object-cover" />
                  </div>
                )}

                <div
                  className={`flex flex-col ${
                    isUser ? "items-end max-w-[85%] sm:max-w-[70%]" : "items-start max-w-[90%] sm:max-w-[80%]"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                        : "bg-white text-slate-800 dark:bg-[#121215] dark:text-slate-100 border border-slate-200/80 dark:border-slate-800/80 rounded-tl-xs shadow-2xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400 px-1 font-medium">{msg.time}</span>
                </div>
              </div>
            );
          })}

        {/* Loading Indicator */}
        {isProcessing && (
          <div className="flex justify-start items-center gap-3 w-full animate-fade-in-up">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[#703ceb] shadow-xs">
              <img src={samAvatar} alt="Sam" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#121215] border border-slate-200/80 dark:border-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Sam is thinking...</span>
            </div>
          </div>
        )}

        {/* Parsed Action Item Confirmation Cards */}
        {parsedResults.length > 0 && (
          <div className="flex justify-start items-start gap-3 w-full animate-fade-in-up">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full overflow-hidden bg-[#703ceb] shadow-xs mt-0.5">
              <img src={samAvatar} alt="Sam" className="h-full w-full object-cover" />
            </div>

            <div className="flex flex-col max-w-[90%] sm:max-w-[85%] space-y-3 w-full">
              <div className="rounded-2xl border border-indigo-200/80 bg-white p-4 shadow-sm dark:border-indigo-900/40 dark:bg-[#121215] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />
                    {confirmationPromptText ? "Confirmation Required" : `Review extracted actions (${parsedResults.length})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedResults([]);
                      setConfirmationPromptText(null);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {confirmationPromptText && (
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-indigo-50/60 dark:bg-indigo-950/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                    {confirmationPromptText}
                  </p>
                )}

                <div className="space-y-2">
                  {parsedResults.map((res, index) => {
                    if (res.type === "ambiguous") {
                      return (
                        <div
                          key={`amb-${index}`}
                          className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-950/20 text-xs"
                        >
                          <p className="font-bold text-amber-800 dark:text-amber-300 mb-2">
                            Which destination did you mean?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(res.ambiguousOptions || []).map((opt) => (
                              <button
                                key={opt.type}
                                type="button"
                                onClick={() => handleResolveAmbiguity(index, opt)}
                                className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-100 dark:border-amber-700 dark:bg-[#1a1714] dark:text-amber-200"
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
                        className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 dark:border-slate-800/80 dark:bg-[#17171a]/70"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${tagInfo.color}`}>
                            <TagIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase ${tagInfo.color}`}>
                                {tagInfo.label}
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {entities.title || entities.mealName || entities.habitName || entities.name || entities.heading || (entities.items && entities.items.join(", ")) || "Item"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {entities.amount !== undefined && `AED ${entities.amount} `}
                              {entities.category && `• ${entities.category} `}
                              {entities.dueDate && `• ${entities.dueDate} `}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setParsedResults((prev) => prev.filter((_, idx) => idx !== index))}
                          className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedResults([]);
                      setConfirmationPromptText(null);
                    }}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isProcessing || parsedResults.some((r) => r.type === "ambiguous")}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isProcessing ? "Saving..." : "Confirm & Save to Mindo"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Anchor element for smooth auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Chat Composer at Bottom */}
      <div className="shrink-0 border-t border-slate-200/80 bg-white/95 dark:border-slate-800/80 dark:bg-[#121214]/95 backdrop-blur-md px-3 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0.75rem))] z-20">
        <div className="max-w-3xl mx-auto w-full">
          {/* Status Alert if any */}
          {statusMessage && (
            <div
              className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                statusMessage.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
              }`}
            >
              <span className="truncate">{statusMessage.text}</span>
              <button type="button" onClick={() => setStatusMessage(null)} className="ml-2">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Voice Error Alert */}
          {voiceError && (
            <div className="mb-2 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
              <span className="truncate">{voiceError}</span>
              <button type="button" onClick={() => setVoiceError(null)} className="ml-2">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Composer Box */}
          <form onSubmit={handleFormSubmit} className="relative flex items-end gap-2">
            <div className="relative flex-1 flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a1e] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-2xs transition">
              <textarea
                ref={inputRef}
                value={commandText}
                onChange={(e) => {
                  setCommandText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleFormSubmit();
                  }
                }}
                rows={1}
                placeholder="Message Sam..."
                className="w-full resize-none bg-transparent px-3.5 py-2.5 sm:px-4 sm:py-3 pr-10 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none max-h-32 min-h-[42px]"
              />

              <button
                type="button"
                onClick={handleMicClick}
                title={isListening ? "Stop listening" : "Voice input"}
                className={`absolute right-2 bottom-2 flex h-7.5 w-7.5 items-center justify-center rounded-xl transition cursor-pointer ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={!commandText.trim() || isProcessing}
              title="Send message to Sam"
              className="flex h-10.5 w-10.5 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer mb-0.5"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>

          <p className="hidden sm:block text-[10px] text-center text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
            Sam automatically updates your tasks, expenses, groceries, meals, habits & reminders.
          </p>
        </div>
      </div>
    </div>
  );
}
