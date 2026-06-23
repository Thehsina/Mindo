// src/redux/grocerySlice.js
import { createSlice } from "@reduxjs/toolkit";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const grocerySlice = createSlice({
  name: "grocery",
  initialState: [],
  reducers: {
    setGrocery: (state, action) => action.payload,
    addItem: (state, action) => {
      state.push(action.payload);
    },
    deleteItem: (state, action) => state.filter(i => i.id !== action.payload),
    updateItem: (state, action) => {
      const itemIndex = state.findIndex(i => i.id === action.payload.id);
      if (itemIndex !== -1) {
        // Merge all properties from payload while preserving existing properties
        state[itemIndex] = { ...state[itemIndex], ...action.payload };
      }
    },
    replaceItemId: (state, action) => {
      const { tempId, realId } = action.payload;
      const item = state.find(i => i.id === tempId);
      if (item) item.id = realId;
    },
  }
});

export const { setGrocery, addItem, deleteItem, updateItem, replaceItemId } = grocerySlice.actions;
export default grocerySlice.reducer;

// Firestore functions
export const fetchGroceryFirestore = () => async (dispatch) => {
  const groceryCollection = collection(db, "grocery");
  const snapshot = await getDocs(groceryCollection);
  const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  dispatch(setGrocery(items));
};

export const addItemFirestore = (item) => async (dispatch) => {
  const tempId = `temp-grocery-${Date.now()}`;
  const itemWithTempId = { completed: false, ...item, id: tempId };
  dispatch(addItem(itemWithTempId));
  try {
    const docRef = await addDoc(collection(db, "grocery"), {
      ...item,
      completed: false,
    });
    dispatch(replaceItemId({ tempId, realId: docRef.id }));
  } catch (err) {
    console.error("Failed to save grocery item to Firestore:", err);
    dispatch(deleteItem(tempId));
  }
};

export const deleteItemFirestore = (id) => async (dispatch) => {
  if (id.startsWith("temp-")) {
    dispatch(deleteItem(id));
    return;
  }
  try {
    await deleteDoc(doc(db, "grocery", id));
    dispatch(deleteItem(id));
  } catch (err) {
    console.error("Failed to delete grocery item from Firestore:", err);
    dispatch(deleteItem(id));
  }
};

export const updateItemFirestore = (item) => async (dispatch) => {
  if (item.id.startsWith("temp-")) {
    dispatch(updateItem(item));
    return;
  }
  // Optimistic update - update Redux immediately with all item properties
  dispatch(updateItem(item));
  
  try {
    const updateData = {
      name: item.name,
      bucketLabel: item.bucketLabel ?? null,
      listType: item.listType,
      completed: !!item.completed,
    };
    // Preserve createdAt if it exists
    if (item.createdAt) {
      updateData.createdAt = item.createdAt;
    }
    await updateDoc(doc(db, "grocery", item.id), updateData);
  } catch (err) {
    console.error("Failed to update grocery item in Firestore:", err);
  }
};