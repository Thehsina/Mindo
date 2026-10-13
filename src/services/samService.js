import { parseUniversalCommand } from "./commandParserService";

/**
 * Sam Assistant Orchestrator Service
 * Connects frontend Sam UI to secure backend endpoint (/api/sam) powered by OpenAI Responses API
 * Falls back gracefully to local smart command parser if API key is unconfigured or server is unreachable.
 */

export async function processSamQuery({ message, chatHistory = [], contextData = {} }) {
  const rawText = (message || "").trim();
  if (!rawText) return null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

  const context = {
    today,
    weekday,
    tasks: contextData.tasks || [],
    grocery: contextData.grocery || [],
    habits: contextData.habits?.habits || contextData.habits || [],
    completions: contextData.habits?.completions || [],
    meals: contextData.meals || [],
    expenses: contextData.expenses || [],
    notes: contextData.notes || [],
  };

  try {
    const res = await fetch("/api/sam", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: rawText,
        chatHistory: (chatHistory || []).slice(-10),
        context,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        return {
          source: "openai",
          ...data.data,
        };
      }
    }

    // Handle missing key or server status
    if (res.status === 503 || res.status === 404) {
      console.info("[Sam Service] Server endpoint unavailable or OPENAI_API_KEY unconfigured. Using local assistant engine.");
    }
  } catch (err) {
    console.info("[Sam Service] Backend call skipped/fallback triggered:", err.message);
  }

  // Graceful Local Fallback Engine
  const localResults = parseUniversalCommand(rawText, {
    habits: context.habits,
    completions: context.completions,
    tasks: context.tasks,
    grocery: context.grocery,
    meals: context.meals,
    expenses: context.expenses,
    notes: context.notes,
  }, (chatHistory || []).slice(-10));

  if (!localResults || localResults.length === 0) {
    return {
      source: "local",
      replyText: "I'm not sure what you'd like to check or add. Try asking e.g., 'What are my tasks today?' or 'Add milk to grocery list'.",
      intentType: "casual",
      requiresConfirmation: false,
      confirmationPrompt: null,
      actions: [],
    };
  }

  const queries = localResults.filter((r) => r.type === "query");
  const actions = localResults.filter((r) => r.type !== "query");

  if (queries.length > 0) {
    const combinedAnswer = queries.map((q) => q.answer).join("\n\n");
    return {
      source: "local",
      replyText: combinedAnswer,
      intentType: "query",
      requiresConfirmation: false,
      confirmationPrompt: null,
      actions: [],
    };
  }

  const isMulti = actions.length > 1;
  const isDelete = actions.some((a) => a.type?.toLowerCase().includes("delete") || a.type?.toLowerCase().includes("clear"));
  const isAmbiguous = actions.some((a) => a.type === "ambiguous");

  let intentType = "mutation";
  if (isMulti) intentType = "brain_dump";
  if (isDelete) intentType = "confirmation";
  if (isAmbiguous) intentType = "clarification";

  const mappedActions = actions.map((act) => {
    let actionType = "CREATE_TASK";
    const t = (act.type || "").toLowerCase();
    if (t === "expense" || t === "income") actionType = "CREATE_EXPENSE";
    else if (t === "meal") actionType = "CREATE_MEAL";
    else if (t === "grocery") actionType = "CREATE_GROCERY";
    else if (t === "habit") actionType = "CREATE_HABIT";
    else if (t === "note") actionType = "CREATE_NOTE";
    else if (t === "reminder") actionType = "CREATE_REMINDER";
    else if (t === "task") actionType = "CREATE_TASK";

    return {
      type: actionType,
      entities: act.entities || {},
      rawItem: act,
    };
  });

  return {
    source: "local",
    replyText: isMulti
      ? `I found ${actions.length} items in your statement. Review and save them below:`
      : isDelete
      ? "Please confirm if you want to proceed with this deletion."
      : "I extracted the following action. Confirm to save to Mindo:",
    intentType,
    requiresConfirmation: isMulti || isDelete || isAmbiguous,
    confirmationPrompt: isMulti
      ? "Here is what I found. Should I save these to Mindo?"
      : isDelete
      ? "Are you sure you want to execute this action?"
      : null,
    actions: mappedActions,
  };
}
