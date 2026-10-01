// src/redux/grocerySlice.js
import { createSlice } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase.js";

const normalizeGroceryItem = (item = {}) => ({
  id: item.id || `grocery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  name: item.name || "",
  quantity: item.quantity ?? "",
  category: item.category || "Other",
  bucketLabel: item.bucketLabel || "",
  listType: item.listType || "weekly",
  completed: Boolean(item.completed),
  createdAt: item.createdAt || new Date().toISOString(),
});

const grocerySlice = createSlice({
  name: "grocery",
  initialState: [],
  reducers: {
    setGrocery: (state, action) => action.payload.map(normalizeGroceryItem),
    addItem: (state, action) => {
      state.push(normalizeGroceryItem(action.payload));
    },
    deleteItem: (state, action) => state.filter((i) => i.id !== action.payload),
    updateItem: (state, action) => {
      const itemIndex = state.findIndex((i) => i.id === action.payload.id);
      if (itemIndex !== -1) {
        state[itemIndex] = normalizeGroceryItem({ ...state[itemIndex], ...action.payload });
      }
    },
    replaceItemId: (state, action) => {
      const { tempId, realId } = action.payload;
      const item = state.find((i) => i.id === tempId);
      if (item) item.id = realId;
    },
  },
});

export const { setGrocery, addItem, deleteItem, updateItem, replaceItemId } = grocerySlice.actions;
export default grocerySlice.reducer;

export const mapGroceryFromDb = (row = {}) => normalizeGroceryItem({
  id: row.id,
  name: row.name || "",
  quantity: row.quantity ?? "",
  category: row.category || "Other",
  bucketLabel: row.bucket_label || "",
  listType: row.list_type || "weekly",
  completed: Boolean(row.completed),
  createdAt: row.created_at,
});

export const buildGroceryDbPayload = (item = {}, options = {}) => {
  const { includeCategory = true } = options;
  const payload = {
    name: item.name || "",
    quantity: item.quantity ?? "",
    bucket_label: item.bucketLabel ?? "",
    list_type: item.listType || "weekly",
    completed: Boolean(item.completed),
  };

  if (includeCategory) {
    payload.category = item.category || "Other";
  }

  return payload;
};

export const mapGroceryToDb = (item = {}) => buildGroceryDbPayload(item, { includeCategory: true });

const normalizeLocalGroceryArray = (items = []) => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeGroceryItem).filter((item) => item.name || item.id);
};

const readLocalGrocery = () => {
  try {
    const raw = localStorage.getItem("tm.grocery");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeLocalGroceryArray(parsed);
  } catch (error) {
    console.error("Failed to read local grocery items:", error);
    return [];
  }
};

const writeLocalGrocery = (items) => {
  const normalized = normalizeLocalGroceryArray(items);
  localStorage.setItem("tm.grocery", JSON.stringify(normalized));
  return normalized;
};

export const fetchGroceryFirestore = () => async (dispatch) => {
  try {
    if (!isSupabaseConfigured) {
      dispatch(setGrocery(readLocalGrocery()));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      dispatch(setGrocery(readLocalGrocery()));
      return;
    }

    const { data, error } = await supabase
      .from("grocery")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const items = (data || []).map(mapGroceryFromDb);

    dispatch(setGrocery(items));
  } catch (err) {
    console.error("Failed to fetch grocery items from Supabase:", err);
  }
};

export const addItemFirestore = (item) => async (dispatch) => {
  const tempId = `temp-grocery-${Date.now()}`;
  const itemWithTempId = normalizeGroceryItem({ completed: false, ...item, id: tempId });
  dispatch(addItem(itemWithTempId));

  try {
    if (!isSupabaseConfigured) {
      const newItem = normalizeGroceryItem({
        ...item,
        id: `grocery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        completed: false,
        createdAt: new Date().toISOString(),
      });
      const items = writeLocalGrocery([...readLocalGrocery(), newItem]);
      dispatch(setGrocery(items));
      dispatch(replaceItemId({ tempId, realId: newItem.id }));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const newItem = normalizeGroceryItem({
        ...item,
        id: `grocery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        completed: false,
        createdAt: new Date().toISOString(),
      });
      const items = writeLocalGrocery([...readLocalGrocery(), newItem]);
      dispatch(setGrocery(items));
      dispatch(replaceItemId({ tempId, realId: newItem.id }));
      return;
    }

    const tryInsert = async (includeCategory) => {
      const dbData = {
        ...buildGroceryDbPayload(item, { includeCategory }),
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from("grocery")
        .insert([dbData])
        .select();

      if (error && includeCategory && /category/i.test(error.message || "")) {
        return tryInsert(false);
      }

      if (error) throw error;
      return data;
    };

    const data = await tryInsert(true);

    if (data && data[0]) {
      dispatch(replaceItemId({ tempId, realId: data[0].id }));
    }
  } catch (err) {
    console.error("Failed to save grocery item to Supabase:", err);
    dispatch(deleteItem(tempId));
  }
};

export const deleteItemFirestore = (id) => async (dispatch) => {
  if (id.startsWith("temp-")) {
    dispatch(deleteItem(id));
    return;
  }

  try {
    if (!isSupabaseConfigured) {
      const items = writeLocalGrocery(readLocalGrocery().filter((i) => i.id !== id));
      dispatch(setGrocery(items));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const items = writeLocalGrocery(readLocalGrocery().filter((i) => i.id !== id));
      dispatch(setGrocery(items));
      return;
    }

    const { error } = await supabase
      .from("grocery")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    dispatch(deleteItem(id));
  } catch (err) {
    console.error("Failed to delete grocery item from Supabase:", err);
    dispatch(deleteItem(id));
  }
};

export const updateItemFirestore = (item) => async (dispatch) => {
  if (item.id.startsWith("temp-")) {
    dispatch(updateItem(item));
    return;
  }

  dispatch(updateItem(item));

  try {
    if (!isSupabaseConfigured) {
      const items = writeLocalGrocery(
        readLocalGrocery().map((i) => (i.id === item.id ? normalizeGroceryItem({ ...i, ...item }) : i))
      );
      dispatch(setGrocery(items));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      const items = writeLocalGrocery(
        readLocalGrocery().map((i) => (i.id === item.id ? normalizeGroceryItem({ ...i, ...item }) : i))
      );
      dispatch(setGrocery(items));
      return;
    }

    const tryUpdate = async (includeCategory) => {
      const updateData = {
        ...buildGroceryDbPayload(item, { includeCategory }),
        completed: !!item.completed,
      };

      const { error } = await supabase
        .from("grocery")
        .update(updateData)
        .eq("id", item.id)
        .eq("user_id", user.id);

      if (error && includeCategory && /category/i.test(error.message || "")) {
        return tryUpdate(false);
      }

      if (error) throw error;
    };

    await tryUpdate(true);
  } catch (err) {
    console.error("Failed to update grocery item in Supabase:", err);
  }
};