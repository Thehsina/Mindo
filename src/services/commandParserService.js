import { formatDue } from "../utils/dateUtils";

// Helper date parsing
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateInput = (date) => {
  if (!date || Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const getStartOfWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
};

export const getWeekdayFull = (d = new Date()) => {
  return DAYS_FULL[d.getDay()];
};

export const parseNaturalDate = (text = "") => {
  const normalized = text.toLowerCase();
  const now = new Date();

  let targetDate = now;
  let label = "Today";

  if (/\btodays?\b|\btoday's\b|\btonight\b|\bthis evening\b/.test(normalized)) {
    targetDate = now;
    label = "Today";
  } else if (/\btomorrows?\b|\btomorrow's\b/.test(normalized)) {
    targetDate = addDays(now, 1);
    label = "Tomorrow";
  } else if (/\bnext week\b|\bthis week\b/.test(normalized)) {
    targetDate = addDays(now, 7);
    label = "Next week";
  } else {
    const weekdayMap = {
      sunday: 0, sun: 0,
      monday: 1, mon: 1,
      tuesday: 2, tues: 2, tue: 2,
      wednesday: 3, wed: 3, wednes: 3,
      thursday: 4, thu: 4, thurs: 4,
      friday: 5, fri: 5,
      saturday: 6, sat: 6,
    };

    const dayMatch = normalized.match(/\b(?:on|for|this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun)\b/i);
    if (dayMatch) {
      const key = dayMatch[1].toLowerCase();
      const targetIdx = weekdayMap[key];
      if (targetIdx !== undefined) {
        const currentIdx = now.getDay();
        let diff = targetIdx - currentIdx;
        if (diff < 0) diff += 7;
        targetDate = addDays(now, diff);
        label = DAYS_FULL[targetDate.getDay()];
      }
    }
  }

  const weekday = getWeekdayFull(targetDate);
  const weekStartStr = getStartOfWeek(targetDate);

  return {
    dateStr: toDateInput(targetDate),
    label,
    targetDate,
    weekday,
    weekStartStr,
  };
};

export const parseTime = (text = "") => {
  const timeMatch = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] || "00";
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  const match24h = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (match24h) {
    return `${String(match24h[1]).padStart(2, "0")}:${match24h[2]}`;
  }
  return "09:00";
};

// Amount extractor
export const parseAmount = (text = "") => {
  const match = text.match(/(?:aed|\$|dhs|dirhams?)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:aed|\$|dhs|dirhams?)|(?:\bspent|\bpaid|\breceived|\bearned|\bsalary|\bcost)\s+(?:of\s+)?(?:aed|\$)?\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    const amountStr = match[1] || match[2] || match[3];
    return parseFloat(amountStr);
  }
  const fallbackNum = text.match(/\b(\d+(?:\.\d+)?)\b/);
  if (fallbackNum && !/\b(minutes?|mins?|hours?|hrs?|days?|weeks?|pm|am)\b/i.test(text)) {
    return parseFloat(fallbackNum[1]);
  }
  return null;
};

// Category inferrers
export const inferExpenseCategory = (text = "") => {
  const lower = text.toLowerCase();
  if (/(carrefour|lulu|nesto|spinneys|grocery|groceries|supermarket|vegetable|fruit|meat|milk)/i.test(lower)) return "Groceries";
  if (/(restaurant|cafe|coffee|starbucks|lunch|dinner|breakfast|food|mcdonald|kfc|pizza|zomato|talabat)/i.test(lower)) return "Dining Out";
  if (/(electricity|water|wifi|internet|dewa|bill|utility|utilities|phone|recharge)/i.test(lower)) return "Utilities";
  if (/(taxi|uber|careem|petrol|fuel|gas|metro|bus|parking|transport)/i.test(lower)) return "Transportation";
  if (/(movie|cinema|netflix|spotify|game|entertainment|park)/i.test(lower)) return "Entertainment";
  if (/(pharmacy|doctor|hospital|medicine|clinic|health)/i.test(lower)) return "Healthcare";
  if (/(clothes|fashion|amazon|noon|mall|shopping|shoes)/i.test(lower)) return "Shopping";
  return "Other";
};

export const inferIncomeCategory = (text = "") => {
  const lower = text.toLowerCase();
  if (/(salary|paycheck|payroll|wage)/i.test(lower)) return "Salary";
  if (/(freelance|client|project|contract|consulting)/i.test(lower)) return "Freelance";
  if (/(dividend|stock|crypto|investment|profit|rental)/i.test(lower)) return "Investments";
  if (/(gift|present|bonus|reward)/i.test(lower)) return "Gifts";
  return "Other Income";
};

const cleanTitle = (text = "") => {
  return text
    .replace(/^(add|put|remind me to|i spent|spent|paid|received|got|i got|remember that|note:?|plan|mark|create a task to|add a task to|add task to)\s+/i, "")
    .replace(/\s+(for|at|on|in|to)\s+(groceries|grocery list|tasks|meal planner|notes|reminders)$/i, "")
    .trim();
};

export const splitMultiCommands = (rawText = "") => {
  const lines = rawText.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const clauses = [];

  for (const line of lines) {
    const parts = line.split(/\s*(?:;|\b(?:and then|then|also)\b)\s*|\s*,\s*(?=\b(?:add|buy|spent|paid|remind|plan|i spent|salary|received|remember)\b)/i);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (/\band\b/i.test(trimmed) && /(spent|paid|salary|received)/i.test(trimmed) && /(buy|add|remind|call|walk)/i.test(trimmed)) {
        const subParts = trimmed.split(/\s+\band\s+/i);
        clauses.push(...subParts.map((s) => s.trim()).filter(Boolean));
      } else {
        clauses.push(trimmed);
      }
    }
  }

  return clauses.length > 0 ? clauses : [rawText.trim()];
};

/**
 * LEVEL 1: GREETING & AFFIRMATIVE HANDLER
 */
export const handleGreeting = (text = "") => {
  const lower = text.toLowerCase().trim();

  if (/\b(good morning|morning)\b/i.test(lower)) {
    return "Good morning! ☀️ What would you like to check or plan today?";
  }
  if (/\b(good afternoon)\b/i.test(lower)) {
    return "Good afternoon! 🌤️ What can I help you with today?";
  }
  if (/\b(good evening)\b/i.test(lower)) {
    return "Good evening! 🌙 What would you like to review or organize?";
  }
  if (/\b(how are you|how's it going)\b/i.test(lower)) {
    return "I'm doing great and ready to help! What's on your mind today?";
  }
  if (/\b(thanks|thank you|thx)\b/i.test(lower)) {
    return "You're very welcome! Let me know if you need anything else.";
  }
  if (/^(yes|yeah|sure|yep|okay|ok|sounds good|cool)[\s!\.]*$/i.test(lower)) {
    return "Great! 👋 What would you like to check, plan, or add next?";
  }

  return "Hi! 👋 What can I help you with today?";
};

// Helper to extract clean meal dish name
export const extractMealName = (text = "", mealType = "dinner") => {
  let cleaned = text
    .replace(/^(add|put|include|plan|create|make|set)\s+/i, "")
    .replace(/\b(to|in|for|on|as)\s+(the\s+)?(meal\s+planner|meals?|today's|todays|today|tomorrow's|tomorrows|tomorrow|this|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, "")
    .replace(/\b(today's|todays|today|tomorrow's|tomorrows|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this|next)\b/gi, "")
    .replace(/\b(breakfast|lunch|dinner|snack|meal|food)\b/gi, "")
    .replace(/^(for|as|is|should be)\s+/i, "")
    .replace(/\s+(for|as|is|should be)$/i, "")
    .trim();

  cleaned = cleaned.replace(/^[\s,:\-]+|[\s,:\-]+$/g, "").trim();

  if (!cleaned || cleaned.length < 2) return "Planned Meal";

  return cleaned
    .split(" ")
    .map((w) => (["and", "with", "&", "of", "in"].includes(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
};

/**
 * LEVEL 2: SPECIFIC QUERY HANDLERS (READ-ONLY)
 */

// QUERY_TODAY Handler ("todays plan", "what is my plan today", "today schedule")
const handleTodayQuery = (dateInfo, contextData) => {
  const { tasks = [], meals = [], reminders = [], habits = [], completions = [] } = contextData;
  const targetDay = dateInfo.weekday || "Monday";
  const weekStart = dateInfo.weekStartStr || getStartOfWeek();

  const dayTasks = tasks.filter((t) => !t.completed && (t.dueDate === dateInfo.dateStr || (!t.dueDate && dateInfo.label === "Today")));
  const dayMeals = meals.filter((m) => (m.day || "").toLowerCase() === targetDay.toLowerCase() && (!m.dateStr || m.dateStr === weekStart));
  const dayReminders = (reminders || []).filter((r) => r.date === dateInfo.dateStr || r.scheduledAt?.startsWith(dateInfo.dateStr));

  const todayStr = new Date().toISOString().slice(0, 10);
  const dayCompletions = (completions || []).filter((c) => c.date === (dateInfo.dateStr || todayStr) && c.completed);
  const completedHabitIds = new Set(dayCompletions.map((c) => c.habitId));
  const incompleteHabits = (habits || []).filter((h) => !h.paused && !completedHabitIds.has(h.id));

  const parts = [];
  if (dayTasks.length > 0) {
    parts.push(`📌 Tasks (${dayTasks.length}):\n` + dayTasks.map((t) => `• ${t.title}`).join("\n"));
  }
  if (dayReminders.length > 0) {
    parts.push(`🔔 Reminders (${dayReminders.length}):\n` + dayReminders.map((r) => `• ${r.title} — ${r.time || "09:00"}`).join("\n"));
  }
  if (dayMeals.length > 0) {
    parts.push(`🍽 Meals:\n` + dayMeals.map((m) => `• ${m.type ? m.type.toUpperCase() : "MEAL"} — ${m.name}`).join("\n"));
  }
  if (incompleteHabits.length > 0 && dateInfo.label === "Today") {
    parts.push(`✓ Habits Left (${incompleteHabits.length}):\n` + incompleteHabits.map((h) => `• ${h.name}`).join("\n"));
  }

  if (parts.length === 0) {
    return `You don't have anything planned for ${dateInfo.label} (${dateInfo.dateStr}) yet.`;
  }

  return `Here's your plan for ${dateInfo.label}:\n\n${parts.join("\n\n")}`;
};

// QUERY_REMINDERS Handler ("reminders today", "any reminders", "my reminders")
const handleRemindersQuery = (dateInfo, contextData) => {
  const { reminders = [] } = contextData;
  const dayReminders = (reminders || []).filter((r) => r.date === dateInfo.dateStr || r.scheduledAt?.startsWith(dateInfo.dateStr));
  if (dayReminders.length === 0) {
    return `You don't have any reminders set for ${dateInfo.label}.`;
  }
  return `🔔 Reminders for ${dateInfo.label}:\n\n` + dayReminders.map((r) => `• ${r.title} — ${r.time || "09:00"}`).join("\n");
};

// QUERY_TASKS Handler ("todays task", "tasks today", "overdue tasks")
const handleTasksQuery = (dateInfo, text, contextData) => {
  const { tasks = [] } = contextData;
  const lower = text.toLowerCase();

  if (lower.includes("overdue")) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueTasks = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr);
    if (overdueTasks.length === 0) return "You have no overdue tasks! Great job!";
    return `⚠️ Overdue Tasks (${overdueTasks.length}):\n\n` + overdueTasks.map((t) => `• ${t.title} (Due: ${t.dueDate})`).join("\n");
  }

  const dayTasks = tasks.filter((t) => !t.completed && (t.dueDate === dateInfo.dateStr || (!t.dueDate && dateInfo.label === "Today")));
  if (dayTasks.length === 0) {
    return `You don't have any tasks scheduled for ${dateInfo.label}.`;
  }
  return `📋 Tasks for ${dateInfo.label} (${dayTasks.length}):\n\n` + dayTasks.map((t) => `• ${t.title}`).join("\n");
};

// QUERY_APPOINTMENTS Handler ("doctor appointment", "dentist appointment")
const handleAppointmentsQuery = (dateInfo, contextData) => {
  const { tasks = [], reminders = [] } = contextData;
  const matchingReminders = (reminders || []).filter((r) =>
    r.date === dateInfo.dateStr || /(doctor|dentist|appointment|meeting)/i.test(r.title)
  );
  const matchingTasks = tasks.filter((t) =>
    !t.completed && (t.dueDate === dateInfo.dateStr || /(doctor|dentist|appointment|meeting)/i.test(t.title))
  );

  const items = [
    ...matchingReminders.map((r) => `Reminder: ${r.title} (${r.date || "Today"} at ${r.time || "09:00"})`),
    ...matchingTasks.map((t) => `Task: ${t.title} (${t.dueDate || "No date"})`),
  ];

  if (items.length === 0) {
    return `You don't have any appointments scheduled for ${dateInfo.label}.`;
  }
  return `📅 Appointments for ${dateInfo.label}:\n\n` + items.map((i) => `• ${i}`).join("\n");
};

// QUERY_MEALS Handler ("what's for dinner", "todays meals")
const handleMealsQuery = (dateInfo, text = "", contextData = {}) => {
  const { meals = [] } = contextData;
  const targetDay = dateInfo.weekday || "Monday";
  const weekStart = dateInfo.weekStartStr || getStartOfWeek();

  const dayMeals = (meals || []).filter((m) => {
    const matchDay = (m.day || "").toLowerCase() === targetDay.toLowerCase();
    const matchWeek = m.dateStr ? m.dateStr === weekStart : true;
    return matchDay && matchWeek;
  });

  const lower = (text || "").toLowerCase();
  let requestedType = null;
  if (/\bdinner\b|\btonight\b|\bsupper\b|\bevening meal\b/.test(lower)) requestedType = "dinner";
  else if (/\blunch\b|\bnoon meal\b|\bafternoon meal\b/.test(lower)) requestedType = "lunch";
  else if (/\bbreakfast\b|\bmorning meal\b/.test(lower)) requestedType = "breakfast";
  else if (/\bsnack\b/.test(lower)) requestedType = "snack";

  if (requestedType) {
    const specificMeal = dayMeals.find((m) => (m.type || "").toLowerCase() === requestedType);
    if (specificMeal) {
      if (dateInfo.label === "Today" && requestedType === "dinner") {
        return `Tonight's dinner is ${specificMeal.name}. 🍓`;
      }
      return `${dateInfo.label === "Today" ? "Today" : dateInfo.label}'s ${requestedType} is ${specificMeal.name}. 🍽`;
    } else {
      return `You don't have ${requestedType} planned for ${dateInfo.label}.`;
    }
  }

  if (dayMeals.length === 0) {
    return `No meals are currently planned for ${dateInfo.label}.`;
  }
  return `🍽 Planned Meals for ${dateInfo.label}:\n\n` + dayMeals.map((m) => `• ${m.type ? m.type.toUpperCase() : "MEAL"}: ${m.name}`).join("\n");
};

// QUERY_GROCERIES Handler ("what groceries do i need", "grocery list")
const handleGroceryQuery = (contextData) => {
  const { grocery = [] } = contextData;
  const pendingItems = grocery.filter((g) => !g.completed);
  if (pendingItems.length === 0) return "Your grocery list is empty! No pending items to buy.";
  return `🛒 Pending Grocery List (${pendingItems.length} items):\n\n` + pendingItems.map((g) => `• ${g.name} ${g.quantity ? `(${g.quantity})` : ""}`).join("\n");
};

// QUERY_HABITS Handler ("habits today", "which habits incomplete")
const handleHabitsQuery = (contextData) => {
  const { habits = [], completions = [] } = contextData;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dayCompletions = (completions || []).filter((c) => c.date === todayStr && c.completed);
  const completedIds = new Set(dayCompletions.map((c) => c.habitId));
  const activeHabits = (habits || []).filter((h) => !h.paused);

  const completed = activeHabits.filter((h) => completedIds.has(h.id));
  const incomplete = activeHabits.filter((h) => !completedIds.has(h.id));

  if (activeHabits.length === 0) return "You haven't set up any active habits yet.";

  return `✓ Habit Status for Today:\n\n• Completed (${completed.length}/${activeHabits.length}): ${completed.map((h) => h.name).join(", ") || "None yet"}\n• Incomplete (${incomplete.length}): ${incomplete.map((h) => h.name).join(", ") || "All completed!"}`;
};

// QUERY_MONEY Handler ("how much did i spend", "expenses this month")
const handleMoneyQuery = (text, dateInfo, contextData) => {
  const { expenses = [] } = contextData;
  const lower = text.toLowerCase();

  if (lower.includes("income")) {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const totalIncome = expenses
      .filter((e) => e.type === "income" && e.date?.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return `💰 Total Income for this month: AED ${totalIncome.toLocaleString()}`;
  }

  if (lower.includes("month")) {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthTotal = expenses
      .filter((e) => e.type !== "income" && e.date?.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return `💳 Total Expenses for this month: AED ${monthTotal.toLocaleString()}`;
  }

  const todayExpenses = expenses.filter((e) => e.type !== "income" && e.date === dateInfo.dateStr);
  const todayTotal = todayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (todayExpenses.length === 0) {
    return `You haven't logged any expenses for ${dateInfo.label}.`;
  }
  return `💳 Expenses for ${dateInfo.label} (Total: AED ${todayTotal}):\n\n` + todayExpenses.map((e) => `• ${e.title}: AED ${e.amount} [${e.category || "Other"}]`).join("\n");
};

// QUERY_NOTES Handler ("my notes", "notes about plumber")
const handleNotesQuery = (text, contextData) => {
  const { notes = [] } = contextData;
  const lower = text.toLowerCase();
  const searchWord = lower.replace(/do i have|a note|note|notes|about|show my/gi, "").trim();
  const matchingNotes = notes.filter((n) =>
    !searchWord || n.heading?.toLowerCase().includes(searchWord) || n.description?.toLowerCase().includes(searchWord)
  );

  if (matchingNotes.length === 0) return `No notes found matching "${searchWord || "your request"}".`;
  return `📝 Notes Found (${matchingNotes.length}):\n\n` + matchingNotes.map((n) => `• ${n.heading || "Untitled"}: ${n.description}`).join("\n");
};

/**
 * 2-LEVEL INTENT EVALUATOR
 */
export const evaluateQueryIntent = (text = "", contextData = {}) => {
  const lower = text.toLowerCase().trim();
  const dateInfo = parseNaturalDate(text);

  // LEVEL 2 QUERY TYPE MATCHING

  // 1. QUERY_TODAY / QUERY_PLAN ("todays plan", "today's plan", "today plan", "what is my plan today", "what's my plan today", "today schedule", "my plan today")
  if (
    /(plan|schedule|agenda|overview|what do i have|what's happening|anything planned|show today's plan|show todays plan|my plan)/i.test(lower) &&
    /(today|todays|today's|tomorrow|tomorrows|tomorrow's|friday|monday|tuesday|wednesday|thursday|saturday|sunday|week)/i.test(lower)
  ) {
    return { queryType: "QUERY_TODAY", answer: handleTodayQuery(dateInfo, contextData) };
  }

  // 2. QUERY_TASKS ("todays task", "today's task", "today task", "tasks today", "any task today", "pending tasks", "overdue tasks")
  if (/(task|tasks|todo|todos|to-do|to-dos|overdue|pending tasks)/i.test(lower)) {
    return { queryType: "QUERY_TASKS", answer: handleTasksQuery(dateInfo, text, contextData) };
  }

  // 3. QUERY_APPOINTMENTS ("doctor appointment", "dentist appointment", "any appointments")
  if (/(appointment|appointments|doctor|dentist|meeting|meetings|calendar|event|events)/i.test(lower)) {
    return { queryType: "QUERY_APPOINTMENTS", answer: handleAppointmentsQuery(dateInfo, contextData) };
  }

  // 4. QUERY_REMINDERS ("reminders today", "any reminders", "my reminders")
  if (/(reminder|reminders|alert|alerts)/i.test(lower)) {
    return { queryType: "QUERY_REMINDERS", answer: handleRemindersQuery(dateInfo, contextData) };
  }

  // 5. QUERY_MEALS ("what's for dinner", "todays meals", "dinner tonight")
  if (/(meal|meals|dinner|lunch|breakfast|snack|food|eating|cook|planned food)/i.test(lower)) {
    return { queryType: "QUERY_MEALS", answer: handleMealsQuery(dateInfo, text, contextData) };
  }

  // 6. QUERY_GROCERIES ("what groceries do i need", "grocery list", "to buy")
  if (/(grocery|groceries|shopping list|buy|to buy|pending items|items pending)/i.test(lower)) {
    return { queryType: "QUERY_GROCERIES", answer: handleGroceryQuery(contextData) };
  }

  // 7. QUERY_HABITS ("habits today", "todays habits", "which habits incomplete")
  if (/(habit|habits|streak|routine)/i.test(lower)) {
    return { queryType: "QUERY_HABITS", answer: handleHabitsQuery(contextData) };
  }

  // 8. QUERY_MONEY ("how much did i spend", "spent today", "expenses this month", "my balance")
  if (/(spend|spent|expenses?|income|earned|balance|financial|transactions?)/i.test(lower)) {
    return { queryType: "QUERY_MONEY", answer: handleMoneyQuery(text, dateInfo, contextData) };
  }

  // 9. QUERY_NOTES ("my notes", "notes about plumber")
  if (/(note|notes|journal|plumber|eva)/i.test(lower)) {
    return { queryType: "QUERY_NOTES", answer: handleNotesQuery(text, contextData) };
  }

  // Fallback QUERY_TODAY for generic plan requests
  return { queryType: "QUERY_TODAY", answer: handleTodayQuery(dateInfo, contextData) };
};

/**
 * TOP-LEVEL INTENT CLASSIFIER & ROUTER
 * Stage 1: Classifies Level 1 Intent (GREETING, QUERY, CREATE, UNKNOWN)
 * Stage 2: Classifies Level 2 Type (QUERY_TODAY, QUERY_TASKS, CREATE_TASK, etc.)
 */
export const parseSingleCommand = (text = "", contextData = {}) => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  // LEVEL 1 — GREETING / AFFIRMATIVE CHECK
  const isGreeting =
    /^(hi|hello|hey|hey mindo|hi mindo|hello mindo|good morning|good afternoon|good evening|how are you|whats up|sup|thanks|thank you|yes|yeah|sure|yep|okay|ok|sounds good|cool)[\s!\.]*$/i.test(lower) ||
    /^(good morning|good afternoon|good evening|how are you|hey mindo|hi mindo)$/i.test(lower);

  if (isGreeting) {
    const answer = handleGreeting(trimmed);
    console.log("[CommandCenter Router]", {
      input: trimmed,
      topIntent: "GREETING",
      entity: "CONVERSATION",
      actionOrQuery: "QUERY",
      confidence: 1.0,
      finalRoute: "handleGreeting",
    });
    return {
      type: "query",
      intent: "GREETING",
      confidence: 1.0,
      answer,
      entities: { raw: trimmed },
    };
  }

  // LEVEL 1 — EXPLICIT WRITE ACTION VERBS CHECK
  const hasWriteActionVerb =
    /(^|\s)(add|put|include|create|make|remind me to|set reminder|i spent|spent|paid|received|earned|got paid|mark complete|check off|delete|remove|clear)\b/i.test(lower);

  // LEVEL 1 — QUERY CHECK
  const isQueryDomain =
    /(plan|schedule|agenda|overview|task|tasks|todo|todos|to-do|to-dos|appointment|appointments|doctor|dentist|meeting|reminder|reminders|alert|meal|meals|dinner|lunch|breakfast|food|grocery|groceries|shopping|buy|to buy|habit|habits|spend|spent|expense|expenses|income|earned|balance|note|notes|overdue|pending)\b/i.test(lower);

  const isQuestionPattern =
    /(^|\s)(what|which|where|when|how|how much|how many|do i|do i have|what's|what is|can you show|show me|tell me|any|list|pending|overdue|is there|did i|show today's|what about)\b/i.test(lower) ||
    /\?/i.test(lower);

  // If input is a query domain OR question pattern AND has NO write action verb $\rightarrow$ LEVEL 1: QUERY (READ-ONLY)
  if ((isQueryDomain || isQuestionPattern) && !hasWriteActionVerb) {
    const { queryType, answer } = evaluateQueryIntent(trimmed, contextData);
    console.log("[CommandCenter Router]", {
      input: trimmed,
      topIntent: "QUERY",
      queryType,
      actionOrQuery: "QUERY",
      confidence: 0.98,
      finalRoute: "evaluateQueryIntent",
    });
    return {
      type: "query",
      intent: queryType,
      confidence: 0.98,
      answer,
      entities: { raw: trimmed },
    };
  }

  const dateInfo = parseNaturalDate(trimmed);
  const timeStr = parseTime(trimmed);

  // LEVEL 1 — EXPLICIT WRITE ACTIONS (CREATE / UPDATE / DELETE)

  // A. INCOME
  const isIncome = /(salary|received|earned|got paid|income|freelance payment|received aed|received \$|got aed|got \$)/i.test(lower) && !/(spent|paid for|bought)/i.test(lower) && hasWriteActionVerb;
  if (isIncome) {
    const amount = parseAmount(trimmed) || 0;
    let title = trimmed
      .replace(/(salary|received|earned|got paid|from freelance work|as a gift|today|tomorrow)/gi, "")
      .replace(/(aed|\$|dhs|dirhams?|\d+)/gi, "")
      .trim();
    if (!title || title.length < 2) {
      title = lower.includes("salary") ? "Salary" : lower.includes("freelance") ? "Freelance Work" : "Income";
    } else {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    const category = inferIncomeCategory(trimmed);

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "INCOME", actionOrQuery: "ACTION", confidence: 0.95, finalRoute: "createIncome" });
    return {
      type: "income",
      intent: "INCOME_CREATE",
      confidence: 0.95,
      entities: {
        title,
        amount,
        category,
        date: dateInfo.dateStr,
        dateLabel: dateInfo.label,
        type: "income",
        note: `Captured via Command Center: "${trimmed}"`,
      },
    };
  }

  // B. EXPENSE
  const isExpense = /(spent|paid|bought at|cost me|aed|dirhams|dhs|\$)/i.test(lower) && parseAmount(trimmed) !== null && !/(salary|received|earned|got paid)/i.test(lower);
  if (isExpense) {
    const amount = parseAmount(trimmed) || 0;
    let merchant = trimmed
      .replace(/i spent|spent|paid|aed|dirhams?|dhs|\$|\d+(?:\.\d+)?|at|for|today|tomorrow|yesterday/gi, "")
      .trim();
    if (!merchant || merchant.length < 2) {
      merchant = inferExpenseCategory(trimmed);
    } else {
      merchant = merchant.charAt(0).toUpperCase() + merchant.slice(1);
    }
    const category = inferExpenseCategory(trimmed);

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "EXPENSE", actionOrQuery: "ACTION", confidence: 0.95, finalRoute: "createExpense" });
    return {
      type: "expense",
      intent: "EXPENSE_CREATE",
      confidence: 0.95,
      entities: {
        title: merchant,
        amount,
        category,
        date: dateInfo.dateStr,
        dateLabel: dateInfo.label,
        paymentMethod: "Card / Cash",
        type: "expense",
        note: `Captured via Command Center: "${trimmed}"`,
      },
    };
  }

  // C. MEAL PLANNER
  const isMeal = /(meal|dinner|lunch|breakfast|snack|biryani|dosa|curry|chapati|pasta|burger|pizza|salad|soup|cook|plan meal|plan food)/i.test(lower) && !/(add.*to groceries|buy.*groceries|shopping list)/i.test(lower) && (hasWriteActionVerb || /^(add|plan)\s+/i.test(lower));
  if (isMeal) {
    let mealType = "dinner";
    if (/\bbreakfast\b/i.test(lower)) mealType = "breakfast";
    else if (/\blunch\b/i.test(lower)) mealType = "lunch";
    else if (/\bsnack\b/i.test(lower)) mealType = "snack";

    const mealName = extractMealName(trimmed, mealType);

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "MEAL", actionOrQuery: "ACTION", confidence: 0.9, finalRoute: "createMeal" });
    return {
      type: "meal",
      intent: "MEAL_CREATE",
      confidence: 0.9,
      entities: {
        mealName,
        mealType,
        dateStr: dateInfo.weekStartStr,
        dateLabel: dateInfo.label,
        day: dateInfo.weekday,
        notes: `Planned via Command Center`,
        ingredients: [],
      },
    };
  }

  // D. GROCERY
  const isGrocery = (/(grocery|groceries|shopping list)/i.test(lower) || /^(add|need|buy)\s+.*(to groceries|grocery list|to my grocery)/i.test(lower)) && (hasWriteActionVerb || /^(add|need|buy)\s+/i.test(lower));
  if (isGrocery) {
    const cleanListText = trimmed
      .replace(/add|to my grocery list|to groceries|to grocery|i need|buy/gi, "")
      .trim();

    const items = cleanListText
      .split(/\s*,\s*|\s+\band\s+/i)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1));

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "GROCERY", actionOrQuery: "ACTION", confidence: 0.92, finalRoute: "createGrocery" });
    return {
      type: "grocery",
      intent: "GROCERY_CREATE",
      confidence: 0.92,
      entities: {
        items: items.length > 0 ? items : [cleanListText || "Grocery Item"],
        bucketLabel: "This Week",
        listType: "weekly",
      },
    };
  }

  // E. HABIT
  const isHabit = /(habit|walked|workout|meditated|drank.*water|exercise|gym|read.*pages|running|run|journaled)/i.test(lower) && !isQuestionPattern;
  if (isHabit) {
    let habitName = trimmed
      .replace(/i|walked|for|minutes|today|drank|meditated|mark|complete|did/gi, "")
      .replace(/\d+/g, "")
      .trim();

    if (/\bwalk(ed)?\b/i.test(lower)) habitName = "Walking";
    else if (/\bworkout|gym|exercise\b/i.test(lower)) habitName = "Workout";
    else if (/\bwater\b/i.test(lower)) habitName = "Drink Water";
    else if (/\bmeditat(ed)?\b/i.test(lower)) habitName = "Meditation";
    else if (!habitName) habitName = "Daily Habit";
    else habitName = habitName.charAt(0).toUpperCase() + habitName.slice(1);

    const existingHabits = contextData.habits || [];
    const matched = existingHabits.find(
      (h) => h.name.toLowerCase().includes(habitName.toLowerCase()) || habitName.toLowerCase().includes(h.name.toLowerCase())
    );

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "ACTION", entity: "HABIT", actionOrQuery: "ACTION", confidence: 0.88, finalRoute: "habitAction" });
    return {
      type: "habit",
      intent: "HABIT_ACTION",
      confidence: 0.88,
      entities: {
        habitName: matched ? matched.name : habitName,
        habitId: matched ? matched.id : null,
        isExisting: Boolean(matched),
        date: dateInfo.dateStr,
        action: matched ? "complete" : "create",
      },
    };
  }

  // F. REMINDER
  const isReminder = /^remind me/i.test(lower) || /\bremind me to\b/i.test(lower) || /\breminder\b/i.test(lower);
  if (isReminder && hasWriteActionVerb) {
    let title = trimmed
      .replace(/^remind me to|^remind me about|^remind me|^reminder:?/gi, "")
      .replace(/\s+(tomorrow|today|at\s+\d+.*|on\s+\w+)$/gi, "")
      .trim();
    if (!title) title = "Reminder";
    else title = title.charAt(0).toUpperCase() + title.slice(1);

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "REMINDER", actionOrQuery: "ACTION", confidence: 0.95, finalRoute: "createReminder" });
    return {
      type: "reminder",
      intent: "REMINDER_CREATE",
      confidence: 0.95,
      entities: {
        title,
        date: dateInfo.dateStr,
        dateLabel: dateInfo.label,
        time: timeStr,
        notes: trimmed,
      },
    };
  }

  // G. NOTE
  const isNote = /^remember that/i.test(lower) || /^note:?/i.test(lower) || /^take a note/i.test(lower) || /^save note/i.test(lower);
  if (isNote) {
    let heading = trimmed
      .replace(/^remember that|^note:?|^take a note:?|^save note:?/gi, "")
      .trim();
    heading = heading ? heading.charAt(0).toUpperCase() + heading.slice(1) : "Note";

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "NOTE", actionOrQuery: "ACTION", confidence: 0.9, finalRoute: "createNote" });
    return {
      type: "note",
      intent: "NOTE_CREATE",
      confidence: 0.9,
      entities: {
        heading,
        description: trimmed,
      },
    };
  }

  // H. EXPLICIT TASK CREATE (Requires explicit write verbs: "add task", "create task", "make a task")
  const isExplicitTaskAction = /^(add|create|make|buy|finish|call|schedule|book|renew|clean)\s+/i.test(lower) || /^(add task|create task)/i.test(lower);

  if (isExplicitTaskAction && hasWriteActionVerb) {
    let taskTitle = cleanTitle(trimmed);
    if (!taskTitle) taskTitle = trimmed;

    console.log("[CommandCenter Router]", { input: trimmed, topIntent: "CREATE", entity: "TASK", actionOrQuery: "ACTION", confidence: 0.9, finalRoute: "createTask" });
    return {
      type: "task",
      intent: "TASK_CREATE",
      confidence: 0.9,
      entities: {
        title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
        dueDate: dateInfo.dateStr,
        dueDateLabel: dateInfo.label,
        priority: /\b(urgent|asap|important)\b/i.test(lower) ? "High" : "Medium",
        category: /(work|client|project|code|react)/i.test(lower) ? "Work" : "Personal",
      },
    };
  }

  // LEVEL 1 — UNKNOWN / CONVERSATIONAL FALLBACK (CRITICAL: NEVER DEFAULT TO CREATE_TASK!)
  console.log("[CommandCenter Router]", { input: trimmed, topIntent: "UNKNOWN", actionOrQuery: "QUERY", confidence: 0.3, finalRoute: "conversationalFallback" });
  return {
    type: "query",
    intent: "UNKNOWN",
    confidence: 0.3,
    answer: "I can help you check your schedule, manage tasks, groceries, meals, habits, reminders, notes, and money. What would you like to check or plan?",
    entities: { raw: trimmed },
  };
};

/**
 * Universal Command Parser Entrypoint
 */
export const parseUniversalCommand = (input = "", contextData = {}) => {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const clauses = splitMultiCommands(trimmed);
  const results = [];

  for (const clause of clauses) {
    const parsed = parseSingleCommand(clause, contextData);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
};
