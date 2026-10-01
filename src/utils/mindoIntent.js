import { parseBrainDump } from "./brainDump";
import { parseReminderText } from "./notifications";

export const buildMindoSystemPrompt = () => `
You are Mindo, a calm and practical personal productivity assistant.
Your job is to understand natural-language requests and map them to real Mindo actions.

Critical intent rules:
- Question / information requests are READ ONLY. They must NEVER create, update, or delete data.
- Explicit action words such as add, put, remove, delete, update, mark complete, change require a write action.
- A grocery-related word alone is not enough to create a grocery item.
- If the message asks "what", "which", "show", "do I have", "what do I need", or similar, treat it as a QUERY.
- If the message is clearly an instruction like "add milk to my grocery list" or "remove eggs", treat it as an ACTION.
- If the message is a capture statement such as "I need to buy milk and eggs" and not clearly an action, treat it as a BRAIN DUMP / review flow and ask for confirmation before saving.
- If the message is ambiguous, ask a short clarification instead of guessing.
- Do not perform destructive actions without explicit confirmation.

Guidelines:
- Help the user capture thoughts, manage tasks, groceries, notes, and plans.
- Use the existing Mindo data model and flows; do not invent separate databases.
- Treat casual conversation as conversation, not as a database action.
- Keep responses brief, calm, and natural.
`;

const casualPatterns = {
  thanks: /(thank you|thanks|thx|grateful)/i,
  greeting: /(hello|hi|hey|good morning|good afternoon|good evening|good night)/i,
  acknowledgement: /(perfect|great|awesome|okay|sure|got it|nice|sounds good|alright)/i,
};

const isCasualConversation = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  const hasShortReply = /^(thank you|thanks|thx|perfect|great|awesome|okay|sure|got it|nice|alright|hello|hi|hey)$/i.test(trimmed);
  return hasShortReply || Object.values(casualPatterns).some((pattern) => pattern.test(lower));
};

const hasQuestionPattern = (input) => /(^|\s)(what|which|where|when|how many|show me|show|tell me|do i|do i have|what do i|what's|what is|can you show|can you tell|list my|what groceries|what grocery|what do i need|what do i have|what did i|which groceries|what's on my)/i.test(input) || /\?/i.test(input);

const hasExplicitActionVerb = (input) => /(add|put|include|remove|delete|clear|change|update|mark as complete|complete|move|save|pick up|grab|schedule|remind|create)/i.test(input);

const hasCommandVerb = (input) => hasExplicitActionVerb(input) || /(plan|move|mark|complete|update|change|delete|remove|clear|save)/i.test(input);

const isQuery = (input) => hasQuestionPattern(input) || /(what|which|how many|show|list|find|check|review|when|where|do i|do i have)/i.test(input);

const findReferenceItem = (input, session = {}) => {
  const lower = input.toLowerCase();
  const recentItems = session.recentItems || [];

  if (/(it|this|that|them|the first|the last|the eggs|the milk|the task|the item)/i.test(lower) && recentItems.length) {
    return recentItems[0];
  }

  if (/(first|next|latest|top)/i.test(lower)) {
    return recentItems[0] || session.lastActionItem || null;
  }

  return session.lastActionItem || null;
};

const inferCategoryFromInput = (input, session = {}, data = {}) => {
  const lower = input.toLowerCase();
  const grocerySignals = /(grocery|groceries|milk|eggs|bread|fruit|vegetable|apple|banana|tomato|potato|shopping|shop|list)/i;
  const taskSignals = /(task|tasks|todo|call|doctor|meeting|remind|email|project|finish|appointment|plan|schedule)/i;
  const noteSignals = /(note|notes|journal|idea|thought|write down|remember)/i;
  const calendarSignals = /(calendar|event|event schedule|meeting|appointment|today|tomorrow|week|month)/i;

  const parsedItems = parseBrainDump(input);
  const groceryItems = parsedItems.filter((item) => item.type === "grocery");
  const taskItems = parsedItems.filter((item) => item.type === "task");

  const groceryContext = grocerySignals.test(lower) || groceryItems.length > 0;
  const taskContext = taskSignals.test(lower) || taskItems.length > 0;
  const noteContext = noteSignals.test(lower);
  const calendarContext = calendarSignals.test(lower);

  if (parsedItems.length > 0 && (groceryContext || taskContext)) {
    return {
      type: groceryItems.length > taskItems.length ? "brain_dump" : "brain_dump",
      items: parsedItems,
    };
  }

  if (groceryContext && !taskContext) {
    return { type: "grocery" };
  }

  if (taskContext && !groceryContext) {
    return { type: "task" };
  }

  if (noteContext) return { type: "note" };
  if (calendarContext) return { type: "calendar" };

  const hasPlanIntent = /plan my day|plan the day|help me plan|what should i do today|what should i do/i.test(lower);
  if (hasPlanIntent) return { type: "plan" };

  if (data.tasks?.length && /(today|tomorrow|this week|this month|overdue|high priority|incomplete)/i.test(lower)) {
    return { type: "task_query" };
  }

  if (data.grocery?.length && /(grocery|weekly|monthly|shopping)/i.test(lower)) {
    return { type: "grocery_query" };
  }

  return { type: "general" };
};

export const detectIntent = (input, session = {}, data = {}) => {
  const raw = String(input || "").trim();
  if (!raw) {
    return {
      intent: "GENERAL_PRODUCTIVITY",
      action: null,
      parameters: {},
      response: "I’m ready when you are.",
    };
  }

  const lower = raw.toLowerCase();

  if (isCasualConversation(raw)) {
    return {
      intent: "CASUAL_CONVERSATION",
      action: null,
      parameters: { raw },
      response: "",
    };
  }

  const reference = findReferenceItem(raw, session);
  const category = inferCategoryFromInput(raw, session, data);
  const parsedItems = parseBrainDump(raw);

  const isGroceryQuestion = hasQuestionPattern(raw) && /(grocery|groceries|shopping|milk|eggs|bread|fruit|vegetable|potato|list)/i.test(raw);
  const isBuyQuestion = /(what do i need to buy|do i need to buy|what should i buy|what do i need.*buy|what should i buy)/i.test(raw);
  const isTaskQuestion = hasQuestionPattern(raw) && /(task|todo|today|tomorrow|appointment|meeting|project|call|doctor|due|priority|incomplete)/i.test(raw);
  const isNoteQuestion = hasQuestionPattern(raw) && /(note|notes|journal|idea|thought)/i.test(raw);
  const isCalendarQuestion = hasQuestionPattern(raw) && /(calendar|event|schedule|appointment|when|meeting)/i.test(raw);

  if (/plan my day|plan the day|help me plan|what should i do today|what should i do/i.test(lower)) {
    return {
      intent: "PLAN_DAY",
      action: { scope: "tasks" },
      parameters: { reference },
      response: "",
    };
  }

  if (isGroceryQuestion || isBuyQuestion) {
    return {
      intent: "GROCERY_QUERY",
      action: { scope: "grocery", type: "read" },
      parameters: { raw, dateContext: /today|tomorrow|this week|this month/.test(lower) ? lower : null },
      response: "",
    };
  }

  if (isTaskQuestion) {
    return {
      intent: "TASK_QUERY",
      action: { scope: "tasks", type: "read" },
      parameters: { raw },
      response: "",
    };
  }

  if (isNoteQuestion) {
    return {
      intent: "NOTE_QUERY",
      action: { scope: "notes", type: "read" },
      parameters: { raw },
      response: "",
    };
  }

  if (isCalendarQuestion) {
    return {
      intent: "CALENDAR_QUERY",
      action: { scope: "calendar", type: "read" },
      parameters: { raw },
      response: "",
    };
  }

  if (hasQuestionPattern(raw) && !hasExplicitActionVerb(raw)) {
    if (category.type === "grocery" || category.type === "grocery_query" || /grocery|groceries|shopping|weekly|monthly/i.test(lower)) {
      return {
        intent: "GROCERY_QUERY",
        action: { scope: "grocery", type: "read" },
        parameters: { raw },
        response: "",
      };
    }

    if (category.type === "task" || category.type === "task_query" || /(task|todo|today|tomorrow|overdue|priority|incomplete)/i.test(lower)) {
      return {
        intent: "TASK_QUERY",
        action: { scope: "tasks", type: "read" },
        parameters: { raw },
        response: "",
      };
    }
  }

  if (/(remind me|set a reminder|create a reminder|add reminder|reminder to|remind)/i.test(lower) && !hasQuestionPattern(raw)) {
    const parsedReminder = parseReminderText(raw) || {
      title: raw.replace(/^(remind me|set a reminder|create a reminder|add reminder)\s+/i, ""),
      date: new Date().toISOString().slice(0, 10),
      time: "09:00",
      notes: raw,
    };

    return {
      intent: "REMINDER_CREATE",
      action: { kind: "reminder", reminder: parsedReminder },
      parameters: { reminder: parsedReminder, raw },
      response: "",
    };
  }

  if (/delete|remove|clear|cancel|erase|drop|trash/i.test(lower) && !/(do not|don't)/i.test(lower)) {
    return {
      intent: "TASK_DELETE",
      action: { scope: "tasks", reference },
      parameters: { raw, reference },
      response: "",
    };
  }

  if (/(done|complete|finished|mark as done|check off|completed)/i.test(lower)) {
    return {
      intent: "TASK_COMPLETE",
      action: { scope: "tasks", reference },
      parameters: { raw, reference },
      response: "",
    };
  }

  if (parsedItems.length > 0) {
    const hasGrocery = parsedItems.some((item) => item.type === "grocery");
    const hasTask = parsedItems.some((item) => item.type === "task");

    const isLikelyCaptureStatement = /^(i need to buy|i need|need to buy|need to remember|remember|milk and eggs|buy|pickup|pick up)/i.test(raw) && !hasQuestionPattern(raw);

    if (hasGrocery || /grocery|groceries|shopping|milk|eggs|bread/i.test(lower)) {
      if (isLikelyCaptureStatement) {
        return {
          intent: "BRAIN_DUMP",
          action: {
            kind: "multi_item",
            items: parsedItems,
          },
          parameters: { items: parsedItems, reference },
          response: "",
        };
      }
    }

    if (hasTask || /(task|remind|call|doctor|appointment|project|email|meeting)/i.test(lower)) {
      if (isLikelyCaptureStatement || /^(i need|need to|remind me to|call|finish)/i.test(raw)) {
        return {
          intent: "BRAIN_DUMP",
          action: {
            kind: "multi_item",
            items: parsedItems,
          },
          parameters: { items: parsedItems, reference },
          response: "",
        };
      }
    }
  }

  if (/(add|put|include|remove|delete|clear|change|update|mark as complete|complete|move|save)/i.test(lower) && /(grocery|groceries|shopping|milk|eggs|bread|fruit|vegetable|potato|list)/i.test(lower)) {
    const items = parsedItems.filter((item) => item.type === "grocery");
    if (items.length) {
      return {
        intent: "GROCERY_CREATE",
        action: { kind: "grocery", items },
        parameters: { items },
        response: "",
      };
    }

    return {
      intent: "GROCERY_CREATE",
      action: { kind: "grocery", items: [{ title: raw.replace(/^(add|put|include|save|remember|pick up|grab)\s+/i, "").replace(/\s+(to|on)\s+my\s+grocery\s+list.*$/i, ""), quantity: "", type: "grocery" }] },
      parameters: { raw },
      response: "",
    };
  }

  if (/(add|create|schedule|remind|call|need|finish|task|todo|appointment)/i.test(lower) && /task|todo|remind|call|doctor|project|meeting|appointment|deadline/i.test(lower)) {
    const items = parsedItems.filter((item) => item.type === "task");
    if (items.length) {
      return {
        intent: "TASK_CREATE",
        action: { kind: "task", items },
        parameters: { items },
        response: "",
      };
    }

    return {
      intent: "TASK_CREATE",
      action: { kind: "task", items: [{ title: raw.replace(/^(add|create|remember|remind me to|schedule|call|finish|need to)\s+/i, ""), quantity: "", type: "task" }] },
      parameters: { raw },
      response: "",
    };
  }

  if (category.type === "general" && !isQuery(lower) && !hasCommandVerb(raw)) {
    return {
      intent: "GENERAL_PRODUCTIVITY",
      action: null,
      parameters: { raw },
      response: "",
    };
  }

  return {
    intent: "GENERAL_PRODUCTIVITY",
    action: null,
    parameters: { raw },
    response: "",
  };
};

export const generateCasualReply = (input) => {
  const lower = String(input || "").toLowerCase();

  if (/(thank you|thanks|thx|grateful)/i.test(lower)) return "You’re very welcome! 😊";
  if (/(good morning|good evening|good night|hello|hi|hey)/i.test(lower)) return "Hi! How can I help today?";
  if (/(perfect|great|awesome|nice|sounds good|alright|sure|got it|okay)/i.test(lower)) return "Great — what would you like to tackle next?";

  return "Sounds good. What would you like me to help with?";
};

const formatList = (items) => items.map((item) => item.name || item.title).slice(0, 4).join(", ");

const summarizeTasks = (tasks = []) => {
  const active = tasks.filter((task) => !task.completed);
  if (!active.length) return "You do not have any active tasks right now.";

  const next = active.slice(0, 3).map((task) => task.title).join(", ");
  return `You have ${active.length} active task${active.length > 1 ? "s" : ""} right now: ${next}.`;
};

const summarizeGroceries = (grocery = [], input = "") => {
  const weekly = grocery.filter((item) => (item.listType || "weekly") === "weekly");
  const monthly = grocery.filter((item) => (item.listType || "monthly") === "monthly");
  const lower = String(input).toLowerCase();

  if (lower.includes("today") || lower.includes("this week") || lower.includes("weekly")) {
    if (!weekly.length) return "You do not have any weekly grocery items on your list yet.";
    return `You currently have ${weekly.length} weekly grocery item${weekly.length > 1 ? "s" : ""}: ${formatList(weekly)}.`;
  }

  if (lower.includes("month") || lower.includes("monthly")) {
    if (!monthly.length) return "You do not have any monthly grocery items on your list yet.";
    return `You currently have ${monthly.length} monthly grocery item${monthly.length > 1 ? "s" : ""}: ${formatList(monthly)}.`;
  }

  if (!grocery.length) return "Your grocery list is empty right now.";
  return `You currently have ${grocery.length} grocery item${grocery.length > 1 ? "s" : ""}: ${formatList(grocery)}.`;
};

export const generateIntentResponse = (intent, context = {}) => {
  const { tasks = [], grocery = [] } = context;

  switch (intent) {
    case "CASUAL_CONVERSATION":
      return generateCasualReply(context.rawInput || "");

    case "TASK_QUERY":
      return summarizeTasks(tasks);

    case "GROCERY_QUERY":
      return summarizeGroceries(grocery, context.rawInput || "");

    case "PLAN_DAY": {
      const nextTasks = tasks.filter((task) => !task.completed).sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)).slice(0, 3);
      if (!nextTasks.length) return "You have no active tasks yet. This is a good moment to add your next priority item.";
      return `Here is a simple plan: ${nextTasks.map((task, index) => `${index + 1}. ${task.title}`).join("; ")}.`;
    }

    case "GENERAL_PRODUCTIVITY":
      return "I can help with tasks, groceries, planning, or quick productivity questions."

    default:
      return "I can help with that.";
  }
};
