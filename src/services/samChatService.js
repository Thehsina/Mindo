import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase.js";

/**
 * Sam Chat History Persistence Service
 * Resiliently persists Sam conversation sessions and messages in Supabase with LocalStorage sync.
 */

const isTableMissingError = (err) => {
  const message = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("relation") ||
    message.includes("schema cache")
  );
};

const isColumnMissingError = (err) => {
  const message = String(err?.message || "").toLowerCase();
  const code = String(err?.code || "");
  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("could not find column") ||
    message.includes("column")
  );
};

export async function getOrCreateConversation() {
  const user = await getCurrentUser();
  if (!user) return null;

  if (!isSupabaseConfigured || !supabase) {
    const localId = `local-conv-${user.id || "user"}`;
    return { id: localId, title: "Sam Chat", user_id: user.id || "local-user" };
  }

  try {
    const { data, error } = await supabase
      .from("sam_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      if (isTableMissingError(error) || isColumnMissingError(error)) {
        console.info("[Sam Chat Service] sam_conversations table not present in schema; using stable user session ID.");
        return { id: `sam-conv-${user.id}`, title: "Sam Chat", user_id: user.id };
      }
      console.warn("[Sam Chat Service] Warning fetching sam_conversations:", error.message || error);
    }

    if (data && data.length > 0) {
      return data[0];
    }

    // Attempt to create a new conversation record
    const { data: newConv, error: createErr } = await supabase
      .from("sam_conversations")
      .insert({ user_id: user.id, title: "Sam Chat" })
      .select("id, title, created_at, updated_at")
      .single();

    if (createErr) {
      if (isTableMissingError(createErr) || isColumnMissingError(createErr)) {
        return { id: `sam-conv-${user.id}`, title: "Sam Chat", user_id: user.id };
      }
      console.warn("[Sam Chat Service] Warning creating sam_conversation record:", createErr.message || createErr);
    }

    return newConv || { id: `sam-conv-${user.id}`, title: "Sam Chat", user_id: user.id };
  } catch (err) {
    console.error("[Sam Chat Service] Exception in getOrCreateConversation:", err);
    return { id: `sam-conv-${user.id}`, title: "Sam Chat", user_id: user.id };
  }
}

export async function fetchConversationMessages(conversationId) {
  const user = await getCurrentUser();
  if (!user) return [];

  const localKey = `tm.sam_messages_${user.id || "local-user"}`;

  if (!isSupabaseConfigured || !supabase) {
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  }

  try {
    // Attempt 1: Fetch with conversation_id column
    let query = supabase
      .from("sam_messages")
      .select("id, conversation_id, role, content, intent_type, actions, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (
      conversationId &&
      !conversationId.startsWith("sam-conv-") &&
      !conversationId.startsWith("local-conv-")
    ) {
      query = query.eq("conversation_id", conversationId);
    }

    let { data, error } = await query;

    // Attempt 2: If conversation_id column is missing in table, fallback to simple select
    if (error && isColumnMissingError(error)) {
      console.info("[Sam Chat Service] Retrying message fetch without conversation_id column...");
      const retryResult = await supabase
        .from("sam_messages")
        .select("id, role, content, intent_type, actions, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      if (isTableMissingError(error)) {
        const raw = localStorage.getItem(localKey);
        return raw ? JSON.parse(raw) : [];
      }
      console.error("[Sam Chat Service] Failed to load Sam messages from Supabase:", error.message || error);
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : [];
    }

    const formattedMessages = (data || []).map((msg) => ({
      id: msg.id,
      conversationId: msg.conversation_id || conversationId,
      role: msg.role,
      text: msg.content,
      intentType: msg.intent_type || "casual",
      actions: msg.actions || [],
      time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: msg.created_at,
    }));

    // Sync to LocalStorage cache for instant availability
    localStorage.setItem(localKey, JSON.stringify(formattedMessages));
    console.log(`[Sam Chat Service] Successfully loaded ${formattedMessages.length} messages from Supabase for user ${user.id}`);

    return formattedMessages;
  } catch (err) {
    console.error("[Sam Chat Service] Exception loading Sam conversation:", err);
    const raw = localStorage.getItem(localKey);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveMessage({ conversationId, role, content, intentType = "casual", actions = [] }) {
  const user = await getCurrentUser();
  if (!user || !content) return null;

  const nowIso = new Date().toISOString();
  const fallbackMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    conversationId: conversationId || `sam-conv-${user.id}`,
    role,
    text: content,
    intentType,
    actions,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    createdAt: nowIso,
  };

  const localKey = `tm.sam_messages_${user.id || "local-user"}`;
  const saveToLocalCache = (msg) => {
    try {
      const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
      const filtered = existing.filter((m) => m.id !== msg.id);
      localStorage.setItem(localKey, JSON.stringify([...filtered, msg]));
    } catch (e) {
      console.error("[Sam Chat Service] Error writing to LocalStorage cache:", e);
    }
  };

  if (!isSupabaseConfigured || !supabase) {
    saveToLocalCache(fallbackMessage);
    return fallbackMessage;
  }

  try {
    const isRealUUID = (id) =>
      typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const basePayload = {
      user_id: user.id,
      role,
      content,
      intent_type: intentType,
      actions: actions || [],
      created_at: nowIso,
    };

    let insertPayload = { ...basePayload };
    if (isRealUUID(conversationId)) {
      insertPayload.conversation_id = conversationId;
    }

    let { data, error } = await supabase
      .from("sam_messages")
      .insert(insertPayload)
      .select("id, role, content, intent_type, actions, created_at")
      .single();

    // Retry without conversation_id if column missing
    if (error && isColumnMissingError(error) && insertPayload.conversation_id) {
      console.info("[Sam Chat Service] Retrying message insert without conversation_id column...");
      const retryResult = await supabase
        .from("sam_messages")
        .insert(basePayload)
        .select("id, role, content, intent_type, actions, created_at")
        .single();
      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) {
      console.error("[Sam Chat Service] Failed to save Sam message to Supabase:", error.message || error);
      saveToLocalCache(fallbackMessage);
      return fallbackMessage;
    }

    const savedMsg = {
      id: data.id,
      conversationId: conversationId || `sam-conv-${user.id}`,
      role: data.role,
      text: data.content,
      intentType: data.intent_type || "casual",
      actions: data.actions || [],
      time: new Date(data.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: data.created_at,
    };

    saveToLocalCache(savedMsg);
    console.log(`[Sam Chat Service] Successfully saved Sam ${role} message to Supabase (ID: ${data.id})`);

    // Update conversation timestamp if conversation record exists
    if (isRealUUID(conversationId)) {
      supabase
        .from("sam_conversations")
        .update({ updated_at: nowIso })
        .eq("id", conversationId)
        .then(() => {})
        .catch(() => {});
    }

    return savedMsg;
  } catch (err) {
    console.error("[Sam Chat Service] Exception saving Sam message:", err);
    saveToLocalCache(fallbackMessage);
    return fallbackMessage;
  }
}

export async function clearSamChat(conversationId) {
  const user = await getCurrentUser();
  if (!user) return;

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from("sam_messages").delete().eq("user_id", user.id);
      const isRealUUID = (id) =>
        typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isRealUUID(conversationId)) {
        query = query.eq("conversation_id", conversationId);
      }
      const { error } = await query;
      if (error) {
        console.error("[Sam Chat Service] Error deleting Sam messages from Supabase:", error.message || error);
      }
    } catch (err) {
      console.error("[Sam Chat Service] Exception clearing Sam chat:", err);
    }
  }

  const localKey = `tm.sam_messages_${user.id || "local-user"}`;
  localStorage.removeItem(localKey);
}
