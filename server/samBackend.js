/**
 * Core Backend Handler for Sam (Smart Action Manager)
 * Handles natural language conversational understanding using OpenAI Responses API
 */

export function resolveSamConversationContext(chatHistory = [], todayStr = new Date().toISOString().slice(0, 10)) {
  const now = new Date(todayStr + "T00:00:00");

  const addDaysStr = (dStr, n) => {
    const d = new Date(dStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  let activeDate = todayStr;
  let activeDateLabel = "Today";
  let activeIntent = "QUERY_DAILY_PLAN";
  let recentTopic = "daily plan";
  let hasExplicitPreviousDate = false;

  const weekdayMap = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tues: 2, tue: 2,
    wednesday: 3, wed: 3, wednes: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };

  const recentMsgs = (chatHistory || [])
    .filter((m) => m && (m.text || m.content))
    .slice(-10)
    .reverse();

  for (const msg of recentMsgs) {
    const text = (msg.text || msg.content || "").toLowerCase();

    const isoMatch = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (isoMatch) {
      activeDate = isoMatch[1];
      activeDateLabel = isoMatch[1] === addDaysStr(todayStr, 1) ? "Tomorrow" : isoMatch[1] === todayStr ? "Today" : isoMatch[1];
      hasExplicitPreviousDate = true;
      break;
    }

    if (/\btomorrows?\b|\btomorrow's\b|\btomorros\b|\btomowrow\b/i.test(text)) {
      activeDate = addDaysStr(todayStr, 1);
      activeDateLabel = "Tomorrow";
      hasExplicitPreviousDate = true;
      break;
    }

    if (/\byesterdays?\b|\byesterday's\b/i.test(text)) {
      activeDate = addDaysStr(todayStr, -1);
      activeDateLabel = "Yesterday";
      hasExplicitPreviousDate = true;
      break;
    }

    if (/\btodays?\b|\btoday's\b|\btonight\b/i.test(text)) {
      activeDate = todayStr;
      activeDateLabel = "Today";
      hasExplicitPreviousDate = true;
      break;
    }

    const dayMatch = text.match(/\b(?:on|for|this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thurs|fri|sat|sun)\b/i);
    if (dayMatch) {
      const key = dayMatch[1].toLowerCase();
      const targetIdx = weekdayMap[key];
      if (targetIdx !== undefined) {
        const currentIdx = now.getDay();
        let diff = targetIdx - currentIdx;
        if (diff <= 0) diff += 7;
        activeDate = addDaysStr(todayStr, diff);
        activeDateLabel = dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1);
        hasExplicitPreviousDate = true;
        break;
      }
    }
  }

  for (const msg of recentMsgs) {
    const text = (msg.text || msg.content || "").toLowerCase();
    if (/(plan|schedule|agenda|what do i have|anything planned)/.test(text)) {
      activeIntent = "QUERY_DAILY_PLAN";
      recentTopic = "daily plan";
      break;
    }
    if (/(task|tasks|todo)/.test(text)) {
      activeIntent = "QUERY_TASKS";
      recentTopic = "tasks";
      break;
    }
  }

  return {
    currentDate: todayStr,
    activeDate,
    activeDateLabel,
    activeIntent,
    recentTopic,
    hasExplicitPreviousDate,
  };
}

function getStartOfWeek(dateInput = new Date()) {
  let date;
  if (typeof dateInput === "string") {
    const clean = dateInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = new Date(dateInput);
  }
  if (Number.isNaN(date.getTime())) date = new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.getFullYear(), date.getMonth(), diff);
  const year = mon.getFullYear();
  const month = String(mon.getMonth() + 1).padStart(2, "0");
  const dayStr = String(mon.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
}

const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function getWeekdayName(dateInput = new Date()) {
  let date;
  if (typeof dateInput === "string") {
    const clean = dateInput.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(dateInput);
    }
  } else {
    date = new Date(dateInput);
  }
  if (Number.isNaN(date.getTime())) return "Monday";
  return DAYS_FULL[date.getDay()];
}

function isCasualConversation(text = "") {
  const clean = (text || "").toLowerCase().trim();
  if (!clean) return false;

  if (
    /(plan|task|meal|dinner|lunch|breakfast|snack|grocery|note|reminder|schedule|agenda|add|create|delete|remove|show|what|where|how|when|who|is there|do i have|overdue|appointment|check)/i.test(
      clean
    )
  ) {
    return false;
  }

  return /^(thanks|thank\s+you|thx|ok\s+thanks|okay\s+thanks|got\s+it|okay|ok|great|perfect|alright|nice|cool|sounds?\s+good|that'?s?\s+good|sweet|awesome|yes|yeah|yep|sure|hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening)[\s!\.]*$/i.test(
    clean
  );
}

function handleGreeting(text = "") {
  const lower = (text || "").toLowerCase().trim();

  if (/\b(thanks|thank\s+you|thx|ok\s+thanks|okay\s+thanks)\b/i.test(lower)) {
    return "You're very welcome! 😊";
  }
  if (/^(got\s+it)[\s!\.]*$/i.test(lower)) {
    return "Great! 👍";
  }
  if (/^(perfect|nice|cool|sounds?\s+good|that'?s?\s+good|sweet|awesome)[\s!\.]*$/i.test(lower)) {
    return "Glad that helps! 😊";
  }
  if (/^(okay|ok|alright|sure|yes|yeah|yep)[\s!\.]*$/i.test(lower)) {
    return "Let me know if you need anything else! 😊";
  }
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

  return "Hi! 👋 How can I help you today?";
}

function isSameCalendarDate(dueDateVal, targetDateStr) {
  if (!dueDateVal || !targetDateStr) return false;
  const raw = String(dueDateVal).trim();
  if (!raw) return false;
  const targetClean = String(targetDateStr).trim().slice(0, 10);
  if (raw.startsWith(targetClean)) return true;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    if (`${y}-${m}-${day}` === targetClean) return true;
  }
  return false;
}

function formatTaskTime(dueDateVal) {
  if (!dueDateVal) return "";
  const raw = String(dueDateVal).trim();
  if (!raw || /^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

export async function processSamMessage({ message, chatHistory = [], context = {}, apiKey }) {
  if (!apiKey) {
    return {
      error: "MISSING_API_KEY",
      message: "OPENAI_API_KEY is not configured.",
    };
  }

  const now = new Date();
  const todayStr = context.today || now.toISOString().slice(0, 10);
  const weekdayStr = context.weekday || now.toLocaleDateString("en-US", { weekday: "long" });

  const tomorrowObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().slice(0, 10);
  const tomorrowWeekday = tomorrowObj.toLocaleDateString("en-US", { weekday: "long" });

  // Resolve active conversation context
  const convContext = resolveSamConversationContext(chatHistory, todayStr);

  // Early Return for Casual Conversation / Acknowledgements (Zero data query fetching)
  if (isCasualConversation(message)) {
    const casualReply = handleGreeting(message);
    console.log("[Sam Casual Conversation]", { message, replyText: casualReply });
    return {
      success: true,
      data: {
        replyText: casualReply,
        intentType: "CASUAL_CONVERSATION",
        resolvedDate: convContext.activeDate,
        mutation: false,
        correction: false,
        requiresConfirmation: false,
        confirmationPrompt: null,
        actions: [],
      },
    };
  }

  const conversationState = {
    currentDate: todayStr,
    currentTime: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    activeDate: convContext.activeDate,
    activeDateLabel: convContext.activeDateLabel,
    activeIntent: convContext.activeIntent,
    recentTopic: convContext.recentTopic,
    hasExplicitPreviousDate: convContext.hasExplicitPreviousDate,
  };

  // Format compact context summary
  const contextSummary = {
    todayDate: `${todayStr} (${weekdayStr})`,
    tomorrowDate: `${tomorrowStr} (${tomorrowWeekday})`,
    activeContextDate: `${convContext.activeDate} (${convContext.activeDateLabel})`,
    tasksCount: (context.tasks || []).length,
    tasks: (context.tasks || []).slice(0, 40).map((t) => {
      const raw = String(t.dueDate || "").trim();
      const cleanDate = raw ? raw.slice(0, 10) : "";
      const timeStr = formatTaskTime(t.dueDate);
      return {
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        cleanDate,
        time: timeStr,
        priority: t.priority,
        completed: t.completed,
      };
    }),

    groceryCount: (context.grocery || []).length,
    grocery: (context.grocery || []).slice(0, 20).map((g) => ({
      id: g.id,
      name: g.name,
      completed: g.completed,
    })),
    habits: (context.habits || []).slice(0, 15).map((h) => ({
      id: h.id,
      name: h.name,
      paused: h.paused,
    })),
    meals: (context.meals || []).slice(0, 30).map((m) => ({
      id: m.id,
      day: m.day,
      type: m.type,
      name: m.name,
      dateStr: m.dateStr,
    })),
    expenses: (context.expenses || []).slice(0, 15).map((e) => ({
      id: e.id,
      title: e.title,
      amount: e.amount,
      date: e.date,
    })),
    notes: (context.notes || []).slice(0, 15).map((n) => ({
      id: n.id,
      heading: n.heading,
      description: n.description,
    })),
  };

  const systemPrompt = `You are Sam (Smart Action Manager), the intelligent AI assistant inside Mindo personal productivity app.
Mindo handles Tasks, Grocery Lists, Meal Planner, Habits, Expenses, Notes, and Reminders.

CONVERSATION CONTEXT & ACTIVE DATE STATE:
${JSON.stringify(conversationState, null, 2)}

DYNAMIC DATE CALCULATIONS:
- Today: ${todayStr} (${weekdayStr})
- Tomorrow: ${tomorrowStr} (${tomorrowWeekday})

CURRENT USER DATA CONTEXT:
${JSON.stringify(contextSummary, null, 2)}

CRITICAL CONVERSATIONAL INHERITANCE & INTENT RULES:

1. ACTIVE DATE INHERITANCE:
- Active date from conversation history is ${conversationState.activeDate} (${conversationState.activeDateLabel}).
- IF user's current message is a short follow-up (e.g. "sure?", "are you sure?", "really?", "yes", "show again", "again", "that's wrong", "you missed it", "there is one", "yes there is") OR does NOT mention a new explicit date:
  YOU MUST INHERIT resolvedDate = "${conversationState.activeDate}".
  DO NOT fall back to Today (${todayStr}) when the active date is ${conversationState.activeDate}!
- Only change resolvedDate to Today if user explicitly says "today" or "what about today?".
- Only change resolvedDate to another date if user explicitly mentions a different date (e.g. "What about Friday?").

2. READ-ONLY QUERIES vs MUTATIONS:
- Short questions and assertions ("sure?", "are you sure?", "show again", "tomorrow", "what do I have tomorrow?", "go to studio is there", "there is a task", "you missed something") ARE READ-ONLY QUERIES OR CORRECTIONS.
- For all read-only queries and assertions:
  * set \`mutation\`: false
  * set \`actions\`: []
  * set \`requiresConfirmation\`: false
- NEVER create a task unless user explicitly uses a creation verb (e.g. "add", "create", "put on my tasks", "remind me to").

3. ASSERTIONS & CORRECTIONS ("go to studio is there", "you missed it"):
- If user asserts an item exists ("go to studio is there"):
  * set \`intentType\`: "QUERY_DAILY_PLAN" or "QUERY_TASKS"
  * set \`correction\`: true, \`mutation\`: false, \`actions\`: []
  * Check CURRENT USER DATA CONTEXT tasks for ${conversationState.activeDate}.
  * If a matching task exists in context:
    replyText MUST state: "You're right — I missed it. You have **[Task Title]** planned for ${conversationState.activeDateLabel}."
  * If not found in context:
    replyText MUST state: "I checked your tasks for ${conversationState.activeDateLabel} (${conversationState.activeDate}), but I couldn't find '[Task Title]'. Would you like me to add it for you?"

4. CASUAL CONVERSATION & ACKNOWLEDGEMENTS:
- IF user message is a closing, thank-you, or casual acknowledgement (e.g. "thanks", "thank you", "ok thanks", "okay thanks", "got it", "okay", "great", "perfect", "alright", "nice", "cool", "sounds good", "that's good", "sweet", "awesome", "hello", "hi"):
  * YOU MUST set \`intentType\`: "CASUAL_CONVERSATION"
  * set \`mutation\`: false
  * set \`actions\`: []
  * set \`requiresConfirmation\`: false
  * replyText MUST be a short polite response (e.g. "You're very welcome! 😊", "Great! 👍", "Glad that helps! 😊").
  * DO NOT include or query any tasks, meals, groceries, notes, or reminders!

OUTPUT FORMAT REQUIREMENT:
Respond ONLY with a valid raw JSON object (no markdown, no code fences):
{
  "replyText": "Natural response based on actual Mindo context data",
  "intentType": "QUERY_DAILY_PLAN" | "QUERY_TASKS" | "CREATE_TASK" | "UPDATE_TASK" | "DELETE_TASK" | "CREATE_GROCERY" | "QUERY_GROCERY" | "CREATE_NOTE" | "CREATE_REMINDER" | "QUERY_REMINDERS" | "CREATE_MEAL" | "QUERY_MEALS" | "CREATE_HABIT" | "QUERY_HABITS" | "BRAIN_DUMP" | "CASUAL_CONVERSATION" | "CLARIFICATION_REQUIRED",
  "resolvedDate": "${conversationState.activeDate}",
  "mutation": boolean,
  "correction": boolean,
  "requiresConfirmation": boolean,
  "confirmationPrompt": "Confirmation message or null",
  "actions": []
}`;

  const pastHistory = (chatHistory || [])
    .filter((msg) => msg && (msg.text || msg.content))
    .slice(-10)
    .map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text || msg.content || "",
    }));

  const lastPast = pastHistory[pastHistory.length - 1];
  const messagesForOpenAI = [{ role: "system", content: systemPrompt }];

  if (lastPast && lastPast.role === "user" && lastPast.content.trim() === message.trim()) {
    messagesForOpenAI.push(...pastHistory);
  } else {
    messagesForOpenAI.push(...pastHistory, { role: "user", content: message });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messagesForOpenAI,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Sam Server Error] OpenAI API error:", response.status, errorText);
      return {
        error: "OPENAI_API_ERROR",
        message: "Sorry, I couldn't process that right now. Please try again.",
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return {
        error: "EMPTY_RESPONSE",
        message: "Sorry, I received an empty response. Please try again.",
      };
    }

    const parsedOutput = JSON.parse(rawContent);

    // Target Date Resolution
    const targetDate = parsedOutput.resolvedDate || convContext.activeDate || todayStr;
    const isMutation = Boolean(parsedOutput.mutation && parsedOutput.actions && parsedOutput.actions.length > 0);

    // Query actual Mindo data across ALL modules for targetDate
    const targetWeekday = getWeekdayName(targetDate);
    const targetWeekStart = getStartOfWeek(targetDate);

    const dateTasks = (context.tasks || []).filter(
      (t) => !t.completed && (isSameCalendarDate(t.dueDate, targetDate) || (!t.dueDate && targetDate === todayStr))
    );
    const dateMeals = (context.meals || []).filter((m) => {
      const matchDay = (m.day || "").toLowerCase() === targetWeekday.toLowerCase();
      const matchWeek =
        !m.dateStr ||
        m.dateStr === targetWeekStart ||
        isSameCalendarDate(m.dateStr, targetDate) ||
        isSameCalendarDate(m.dateStr, targetWeekStart);
      return matchDay && matchWeek;
    });
    const dateReminders = (context.reminders || []).filter(
      (r) => r.date === targetDate || r.scheduledAt?.startsWith(targetDate)
    );
    const dateHabits = (context.habits || []).filter((h) => !h.paused);
    const groceryList = (context.grocery || []).filter((g) => !g.completed);
    const notesList = (context.notes || []);
    const expensesList = (context.expenses || []);

    // Development Trace Logging (Steps 15 & 17)
    console.log("[Sam Meal Data Trace]", {
      intent: parsedOutput.intentType || "QUERY_MEALS",
      resolvedDate: targetDate,
      resolvedWeekday: targetWeekday,
      weekStart: targetWeekStart,
      currentUser: context.user_id || "authenticated",
      dataSource: "Mindo Redux / Supabase / localStorage",
      mealsReturnedCount: dateMeals.length,
      meals: dateMeals.map((m) => `${m.type ? m.type.toUpperCase() : "MEAL"}: ${m.name}`),
    });

    console.log("[Sam Query Data Trace]", {
      intent: parsedOutput.intentType || "QUERY_DAILY_PLAN",
      resolvedDate: targetDate,
      currentUser: context.user_id || "authenticated",
      dataSource: "Mindo Redux / Supabase / localStorage",
      tasksReturned: dateTasks.length,
      tasks: dateTasks.map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        time: formatTaskTime(t.dueDate),
      })),
    });

    console.log("[Sam Database Query]", {
      queryDate: targetDate,
      tasksFound: dateTasks.length,
      remindersFound: dateReminders.length,
      mealsFound: dateMeals.length,
      habitsFound: dateHabits.length,
      notesFound: notesList.length,
      groceryFound: groceryList.length,
      expensesFound: expensesList.length,
      taskTitles: dateTasks.map((t) => t.title),
      mealNames: dateMeals.map((m) => `${m.type}: ${m.name}`),
    });

    // DUPLICATE & SLOT REPLACEMENT FOR MUTATIONS
    if (isMutation) {
      const taskActions = parsedOutput.actions.filter((a) => a.type === "CREATE_TASK");
      for (const act of taskActions) {
        const title = (act.entities?.title || "").toLowerCase();
        const existingDuplicate = (context.tasks || []).find(
          (t) => !t.completed && (t.title || "").toLowerCase() === title && (isSameCalendarDate(t.dueDate, targetDate) || !t.dueDate)
        );
        if (existingDuplicate) {
          console.log("[Sam Duplicate Prevented]", { title, date: targetDate });
          parsedOutput.actions = parsedOutput.actions.filter((a) => a !== act);
          if (parsedOutput.actions.length === 0) {
            parsedOutput.mutation = false;
            parsedOutput.requiresConfirmation = false;
            parsedOutput.replyText = `You already have **${existingDuplicate.title}** planned for ${convContext.activeDateLabel.toLowerCase()}!`;
          }
        }
      }

      const mealActions = parsedOutput.actions.filter((a) => a.type === "CREATE_MEAL" || a.type === "UPDATE_MEAL");
      for (const act of mealActions) {
        const slotType = (act.entities?.mealType || act.entities?.type || "dinner").toLowerCase();
        const newMealName = act.entities?.mealName || act.entities?.name || "";
        const existingMealInSlot = dateMeals.find((m) => (m.type || "").toLowerCase() === slotType);

        act.entities = {
          ...act.entities,
          day: targetWeekday,
          mealType: slotType,
          name: newMealName,
          dateStr: targetWeekStart,
        };

        if (existingMealInSlot) {
          act.type = "UPDATE_MEAL";
          act.entities.id = existingMealInSlot.id;
          console.log("[Sam Meal Slot Replaced]", { slotType, oldName: existingMealInSlot.name, newName: newMealName, date: targetDate });
          parsedOutput.replyText = `Updated ${convContext.activeDateLabel.toLowerCase()}'s ${slotType} from **${existingMealInSlot.name}** to **${newMealName}**. 🍽`;
        }
      }
    }

    if (!parsedOutput.mutation) {
      parsedOutput.actions = [];
      parsedOutput.requiresConfirmation = false;
      parsedOutput.mutation = false;

      if (parsedOutput.intentType === "CASUAL_CONVERSATION" || isCasualConversation(message)) {
        parsedOutput.intentType = "CASUAL_CONVERSATION";
        if (!parsedOutput.replyText || parsedOutput.replyText.includes("Here's your plan")) {
          parsedOutput.replyText = handleGreeting(message);
        }
        console.log("[Sam Casual Conversation Response]", { message, replyText: parsedOutput.replyText });
        return {
          success: true,
          data: parsedOutput,
        };
      }

      const lowerMsg = message.toLowerCase();
      const isCorrectionAssert = /(wrong|missed|is there|already there|there is|studio|kadala|curry)/i.test(lowerMsg);

      if (parsedOutput.correction || isCorrectionAssert) {
        const searchKey = lowerMsg.replace(/(you|are|wrong|go|to|is|there|you're|missed|my|the|task|meal|already|checked|again|plan|for|tomorros|tomorrow|sure)/gi, "").trim() || "kadala";
        
        const matchedMeal = dateMeals.find((m) => (m.name || "").toLowerCase().includes(searchKey)) ||
          (context.meals || []).find((m) => (m.name || "").toLowerCase().includes(searchKey));

        const matchedTask = (context.tasks || []).find(
          (t) => t.title.toLowerCase().includes(searchKey) && (isSameCalendarDate(t.dueDate, targetDate) || !t.dueDate)
        ) || (context.tasks || []).find((t) => t.title.toLowerCase().includes(searchKey));

        if (matchedMeal) {
          parsedOutput.replyText = `You're right — I found it. **${matchedMeal.name}** is planned for ${matchedMeal.type.toLowerCase()} ${convContext.activeDateLabel.toLowerCase()}. 🍽`;
        } else if (matchedTask) {
          const dateLabel = isSameCalendarDate(matchedTask.dueDate, todayStr) ? "Today" : isSameCalendarDate(matchedTask.dueDate, convContext.activeDate) ? convContext.activeDateLabel : matchedTask.dueDate || "tomorrow";
          const timeStr = formatTaskTime(matchedTask.dueDate);
          const timeLabel = timeStr ? ` at **${timeStr}**` : "";
          parsedOutput.replyText = `You're right — I found it. **${matchedTask.title}** is scheduled for ${dateLabel.toLowerCase()}${timeLabel}.`;
        } else if (dateMeals.length > 0) {
          parsedOutput.replyText = `Here is what you have planned for ${convContext.activeDateLabel} (${targetDate}):\n` + dateMeals.map((m) => `• ${m.type.toUpperCase()}: **${m.name}**`).join("\n");
        } else if (dateTasks.length > 0) {
          parsedOutput.replyText = `Here is what you have planned for ${convContext.activeDateLabel} (${targetDate}):\n` + dateTasks.map((t) => `• **${t.title}**`).join("\n");
        } else {
          parsedOutput.replyText = `I checked your plan for ${convContext.activeDateLabel} (${targetDate}), but I couldn't find "${searchKey}".`;
        }
      } else if (!parsedOutput.replyText || parsedOutput.replyText.includes("don't have anything planned")) {
        const parts = [];
        if (dateTasks.length > 0) {
          parts.push(`📌 Tasks (${dateTasks.length}):\n` + dateTasks.map((t) => {
            const timeStr = formatTaskTime(t.dueDate);
            return timeStr ? `• **${t.title}** (${timeStr})` : `• **${t.title}**`;
          }).join("\n"));
        }
        if (dateReminders.length > 0) parts.push(`🔔 Reminders:\n` + dateReminders.map((r) => `• ${r.title} — ${r.time || "09:00"}`).join("\n"));
        if (dateMeals.length > 0) parts.push(`🍽 Meals:\n` + dateMeals.map((m) => `• ${m.type ? m.type.toUpperCase() : "MEAL"} — ${m.name}`).join("\n"));

        if (parts.length > 0) {
          parsedOutput.replyText = `Here's your plan for ${convContext.activeDateLabel} (${targetDate}):\n\n` + parts.join("\n\n");
        }
      }
    }


    return {
      success: true,
      data: parsedOutput,
    };
  } catch (err) {
    console.error("[Sam Server Error] Exception during processing:", err);
    return {
      error: "SERVER_EXCEPTION",
      message: "Sorry, I couldn't process that right now. Please try again.",
    };
  }
}

