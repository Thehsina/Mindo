// src/redux/expensesSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase.js";

export const INCOME_CATEGORIES = [
  { id: "Salary", label: "Salary", emoji: "💼", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "Freelance", label: "Freelance", emoji: "💻", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { id: "Business", label: "Business", emoji: "📈", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "Investment", label: "Investment", emoji: "🪙", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "Gift", label: "Gift", emoji: "🎁", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { id: "Refund", label: "Refund", emoji: "🔄", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  { id: "Other", label: "Other Income", emoji: "💰", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
];

export const EXPENSE_CATEGORIES = [
  { id: "Groceries", label: "Groceries", emoji: "🛒", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { id: "Food & Dining", label: "Food & Dining", emoji: "🍔", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { id: "Shopping", label: "Shopping", emoji: "🛍️", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { id: "Baby", label: "Baby", emoji: "👶", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { id: "Transport", label: "Transport", emoji: "🚗", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { id: "Bills", label: "Bills", emoji: "💡", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "Health", label: "Health", emoji: "🩺", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  { id: "Entertainment", label: "Entertainment", emoji: "🎬", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { id: "Home", label: "Home", emoji: "🏡", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  { id: "Other", label: "Other", emoji: "📦", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
];

export const CATEGORIES = EXPENSE_CATEGORIES;

export const normalizeExpenseItem = (item = {}) => ({
  id: item.id || `expense-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  type: item.type || item.transaction_type || "expense",
  amount: typeof item.amount === "number" ? item.amount : parseFloat(item.amount) || 0,
  currency: item.currency || "AED",
  description: item.description || "",
  category: item.category || "Other",
  paymentMethod: item.paymentMethod || item.payment_method || "Bank Transfer",
  date: item.date || new Date().toISOString().slice(0, 10),
  note: item.note || "",
  receiptUrl: item.receiptUrl || item.receipt_url || null,
  receiptName: item.receiptName || item.receipt_name || null,
  source: item.source || "manual",
  aiExtracted: Boolean(item.aiExtracted || item.ai_extracted),
  aiConfidence: item.aiConfidence || item.ai_confidence || null,
  createdAt: item.createdAt || item.created_at || new Date().toISOString(),
  updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
});

const expensesSlice = createSlice({
  name: "expenses",
  initialState: [],
  reducers: {
    setExpenses: (state, action) => (Array.isArray(action.payload) ? action.payload.map(normalizeExpenseItem) : []),
    addExpense: (state, action) => {
      state.unshift(normalizeExpenseItem(action.payload));
    },
    deleteExpense: (state, action) => state.filter((i) => i.id !== action.payload),
    updateExpense: (state, action) => {
      const index = state.findIndex((i) => i.id === action.payload.id);
      if (index !== -1) {
        state[index] = normalizeExpenseItem({ ...state[index], ...action.payload, updatedAt: new Date().toISOString() });
      }
    },
    replaceExpenseId: (state, action) => {
      const { tempId, realId } = action.payload;
      const item = state.find((i) => i.id === tempId);
      if (item) item.id = realId;
    },
    clearExpenses: () => [],
  },
});

export const { setExpenses, addExpense, deleteExpense, updateExpense, replaceExpenseId, clearExpenses } = expensesSlice.actions;
export default expensesSlice.reducer;

export const mapExpenseFromDb = (row = {}) =>
  normalizeExpenseItem({
    id: row.id,
    type: row.type || row.transaction_type || "expense",
    amount: row.amount,
    currency: row.currency || "AED",
    description: row.description || "",
    category: row.category || "Other",
    paymentMethod: row.payment_method || row.paymentMethod || "Bank Transfer",
    date: row.date,
    note: row.note || "",
    receiptUrl: row.receipt_url,
    receiptName: row.receipt_name,
    source: row.source || "manual",
    aiExtracted: row.ai_extracted,
    aiConfidence: row.ai_confidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

export const mapExpenseToDb = (item = {}) => ({
  type: item.type || "expense",
  amount: typeof item.amount === "number" ? item.amount : parseFloat(item.amount) || 0,
  currency: item.currency || "AED",
  description: item.description || "",
  category: item.category || "Other",
  payment_method: item.paymentMethod || "Bank Transfer",
  date: item.date || new Date().toISOString().slice(0, 10),
  note: item.note || "",
  receipt_url: item.receiptUrl || null,
  receipt_name: item.receiptName || null,
  source: item.source || "manual",
  ai_extracted: Boolean(item.aiExtracted),
  ai_confidence: item.aiConfidence || null,
});


const readLocalExpenses = () => {
  try {
    const raw = localStorage.getItem("tm.expenses");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeExpenseItem) : [];
  } catch (err) {
    console.error("Failed to read local expenses:", err);
    return [];
  }
};

const writeLocalExpenses = (items) => {
  const normalized = (items || []).map(normalizeExpenseItem);
  localStorage.setItem("tm.expenses", JSON.stringify(normalized));
  return normalized;
};

export const fetchExpensesFirestore = () => async (dispatch) => {
  try {
    if (!isSupabaseConfigured) {
      dispatch(setExpenses(readLocalExpenses()));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      dispatch(setExpenses(readLocalExpenses()));
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) throw error;

    const items = (data || []).map(mapExpenseFromDb);
    dispatch(setExpenses(items));
  } catch (err) {
    console.error("Failed to fetch expenses from Supabase:", err);
    dispatch(setExpenses(readLocalExpenses()));
  }
};

export const addExpenseFirestore = (item) => async (dispatch) => {
  const tempId = `temp-expense-${Date.now()}`;
  const itemWithTempId = normalizeExpenseItem({ ...item, id: tempId });
  dispatch(addExpense(itemWithTempId));

  try {
    if (!isSupabaseConfigured) {
      const newItem = normalizeExpenseItem({
        ...item,
        id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
      const items = writeLocalExpenses([newItem, ...readLocalExpenses()]);
      dispatch(setExpenses(items));
      dispatch(replaceExpenseId({ tempId, realId: newItem.id }));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const newItem = normalizeExpenseItem({
        ...item,
        id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
      const items = writeLocalExpenses([newItem, ...readLocalExpenses()]);
      dispatch(setExpenses(items));
      dispatch(replaceExpenseId({ tempId, realId: newItem.id }));
      return;
    }

    const dbData = {
      ...mapExpenseToDb(item),
      user_id: user.id,
    };

    const { data, error } = await supabase.from("expenses").insert([dbData]).select();

    if (error) throw error;

    if (data && data[0]) {
      dispatch(replaceExpenseId({ tempId, realId: data[0].id }));
    }
  } catch (err) {
    console.error("Failed to save expense to Supabase:", err);
    // Fall back locally on error
    const newItem = normalizeExpenseItem({
      ...item,
      id: `expense-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    const items = writeLocalExpenses([newItem, ...readLocalExpenses().filter((i) => i.id !== tempId)]);
    dispatch(setExpenses(items));
  }
};

export const deleteExpenseFirestore = (id) => async (dispatch) => {
  if (id.startsWith("temp-")) {
    dispatch(deleteExpense(id));
    return;
  }

  dispatch(deleteExpense(id));

  try {
    if (!isSupabaseConfigured) {
      const items = writeLocalExpenses(readLocalExpenses().filter((i) => i.id !== id));
      dispatch(setExpenses(items));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const items = writeLocalExpenses(readLocalExpenses().filter((i) => i.id !== id));
      dispatch(setExpenses(items));
      return;
    }

    const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
  } catch (err) {
    console.error("Failed to delete expense from Supabase:", err);
  }
};

export const updateExpenseFirestore = (item) => async (dispatch) => {
  if (item.id.startsWith("temp-")) {
    dispatch(updateExpense(item));
    return;
  }

  dispatch(updateExpense(item));

  try {
    if (!isSupabaseConfigured) {
      const items = writeLocalExpenses(
        readLocalExpenses().map((i) => (i.id === item.id ? normalizeExpenseItem({ ...i, ...item }) : i))
      );
      dispatch(setExpenses(items));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const items = writeLocalExpenses(
        readLocalExpenses().map((i) => (i.id === item.id ? normalizeExpenseItem({ ...i, ...item }) : i))
      );
      dispatch(setExpenses(items));
      return;
    }

    const updateData = mapExpenseToDb(item);
    const { error } = await supabase.from("expenses").update(updateData).eq("id", item.id).eq("user_id", user.id);
    if (error) throw error;
  } catch (err) {
    console.error("Failed to update expense in Supabase:", err);
  }
};
