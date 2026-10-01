const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const toDateInput = (date) => {
  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const inferDueDate = (text = "") => {
  const normalized = text.toLowerCase();
  const now = new Date();

  if (/\btoday\b/.test(normalized)) return toDateInput(now);
  if (/\btomorrow\b/.test(normalized)) return toDateInput(addDays(now, 1));
  if (/\bnext week\b/.test(normalized)) return toDateInput(addDays(now, 7));
  if (/\bnext month\b/.test(normalized)) return toDateInput(addMonths(now, 1));

  const inDaysMatch = normalized.match(/in\s+(\d+)\s+days?/i);
  if (inDaysMatch) return toDateInput(addDays(now, Number(inDaysMatch[1])));

  const nextWeekMatch = normalized.match(/\bnext\s+(?:mon|tues|wednes|thurs|fri|sat|sun)day\b/i);
  if (nextWeekMatch) {
    const weekdayMap = { sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, wednes: 3, thu: 4, thurs: 4, fri: 5, sat: 6 };
    const target = nextWeekMatch[0].toLowerCase().replace(/day$/, "").trim();
    const targetIndex = weekdayMap[target] ?? 1;
    const currentDay = now.getDay();
    const offset = (targetIndex - currentDay + 7) % 7 || 7;
    return toDateInput(addDays(now, offset));
  }

  return "";
};

const inferPriority = (text = "") => {
  const normalized = text.toLowerCase();
  if (/\b(urgent|asap|immediately|important|high priority)\b/.test(normalized)) return "High";
  if (/\b(soon|before long|this week|later)\b/.test(normalized)) return "Medium";
  return "None";
};

const inferCategory = (text = "") => {
  const normalized = text.toLowerCase();
  if (/(grocery|groceries|milk|bread|eggs|fruit|vegetables|rice|chicken|potato|detergent|diapers|formula)/.test(normalized)) return "Grocery";
  if (/(call|email|message|text|schedule|book|appointment|doctor|dentist|pediatrician)/.test(normalized)) return "Personal";
  if (/(interview|portfolio|react|work|client|presentation|prototype|deploy|launch)/.test(normalized)) return "Work";
  return "Reminders";
};

const cleanFragment = (value = "") => {
  const trimmed = normalizeWhitespace(value).replace(/^[\-•\*\d\.\)]\s*/i, "");
  return trimmed.replace(/^[a-z]+\s+to\s+/i, "");
};

const splitCandidates = (input = "") => {
  const lines = input
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fragments = [];

  for (const line of lines) {
    const parts = line
      .split(/\s*[,;]\s*|\s*\band\s+\b/i)
      .map(cleanFragment)
      .filter(Boolean);

    if (parts.length > 1) {
      fragments.push(...parts);
    } else {
      fragments.push(line);
    }
  }

  return fragments
    .map((fragment) => normalizeWhitespace(fragment))
    .filter((fragment) => fragment.length > 2)
    .filter((fragment, index, arr) => arr.indexOf(fragment) === index);
};

const groceryKeywords = [
  "milk",
  "eggs",
  "egg",
  "bread",
  "potato",
  "potatoes",
  "vegetables",
  "vegetable",
  "fruit",
  "fruits",
  "chicken",
  "rice",
  "detergent",
  "diapers",
  "formula",
  "grocery",
  "groceries"
];

const taskKeywords = [
  "call",
  "email",
  "message",
  "finish",
  "schedule",
  "book",
  "renew",
  "prepare",
  "project",
  "react",
  "doctor",
  "dentist",
  "interview",
  "meeting",
  "appointment",
  "study",
  "review"
];

const extractQuantity = (text = "") => {
  const cleaned = normalizeWhitespace(text).replace(/^(buy|bought|shopping for|need to buy|buying)\s+/i, "");
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(?=\s|$)/);
  if (!match) {
    const unitMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*(l|liter|liters|litre|litres|kg|g|gram|grams|ml|oz|bottles?|boxes?|packs?|pieces?|dozens?)(?=\s|$)/i);
    if (!unitMatch) return "";
    return `${unitMatch[1]} ${unitMatch[2].toLowerCase()}`;
  }

  return match[1];
};

const stripQuantityAndBucket = (text = "") => {
  let cleaned = text.trim();

  cleaned = cleaned.replace(/^(buy|bought|shopping for|need to buy|buying)\s+/i, "");
  cleaned = cleaned.replace(/^\d+(?:\.\d+)?\s*(?:l|liter|liters|litre|litres|kg|g|gram|grams|ml|oz|bottles?|boxes?|packs?|pieces?|dozens?)?\s+/i, "");
  cleaned = cleaned.replace(/\s+(?:for|in)\s+(?:week|wk|month)\s+.*$/i, "");
  cleaned = cleaned.replace(/\s+(?:this|next)\s+(?:week|month)\b.*$/i, "");
  cleaned = cleaned.replace(/\s+for\s+week\s+\d+\b.*$/i, "");
  cleaned = cleaned.replace(/\s+for\s+month\s+\d+\b.*$/i, "");

  return normalizeWhitespace(cleaned);
};

const extractBucketLabel = (text = "") => {
  const weekMatch = text.match(/\b(?:for\s+)?(?:week|wk)\s+(\d+)\b/i);
  if (weekMatch) return `Week ${weekMatch[1]}`;

  if (/\bfor\s+this\s+week\b/i.test(text) || /\bthis\s+week\b/i.test(text)) return "This Week";
  if (/\bfor\s+next\s+week\b/i.test(text) || /\bnext\s+week\b/i.test(text)) return "Next Week";
  if (/\bfor\s+this\s+month\b/i.test(text) || /\bthis\s+month\b/i.test(text)) return "This Month";
  if (/\bfor\s+next\s+month\b/i.test(text) || /\bnext\s+month\b/i.test(text)) return "Next Month";

  return "";
};

const inferGroceryListType = (text = "") => {
  const lower = text.toLowerCase();
  if (/\bmonth\b/.test(lower)) return "monthly";
  if (/\bweek\b/.test(lower)) return "weekly";
  return "weekly";
};

const classifyFragment = (fragment = "") => {
  const cleaned = normalizeWhitespace(fragment);
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const hasGroceryKeyword = groceryKeywords.some((keyword) => lower.includes(keyword));
  const hasTaskKeyword = taskKeywords.some((keyword) => lower.includes(keyword));

  const quantity = extractQuantity(cleaned);
  const bucketLabel = extractBucketLabel(cleaned);
  const listType = inferGroceryListType(cleaned);

  if (hasGroceryKeyword && !hasTaskKeyword) {
    return {
      title: stripQuantityAndBucket(cleaned),
      quantity,
      bucketLabel,
      listType,
      type: "grocery",
      category: "Grocery",
      priority: "None",
      dueDate: "",
      selected: true,
    };
  }

  if (hasTaskKeyword || (!hasGroceryKeyword && lower.includes("call") || lower.includes("finish"))) {
    return {
      title: cleaned,
      quantity: "",
      bucketLabel: "",
      listType: "weekly",
      type: "task",
      category: inferCategory(cleaned),
      priority: inferPriority(cleaned),
      dueDate: inferDueDate(cleaned),
      selected: true,
    };
  }

  if (hasGroceryKeyword) {
    return {
      title: stripQuantityAndBucket(cleaned),
      quantity,
      bucketLabel,
      listType,
      type: "grocery",
      category: "Grocery",
      priority: "None",
      dueDate: "",
      selected: true,
    };
  }

  return null;
};

export const parseBrainDump = (rawText = "") => {
  const cleaned = normalizeWhitespace(rawText);
  if (!cleaned) return [];

  const results = [];
  const fragments = splitCandidates(cleaned);

  fragments.forEach((fragment, index) => {
    const item = classifyFragment(fragment);
    if (!item) return;

    results.push({
      id: `brain-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
      ...item,
    });
  });

  return results.filter((item) => item.title && item.title.length > 1);
};

export const buildDuplicateKey = (title = "", dueDate = "") => {
  const normalized = `${(title || "").trim().toLowerCase()}::${dueDate || ""}`;
  return normalized.replace(/\s+/g, " ");
};
