// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import tasksReducer from "./tasksSlice";
import notesReducer from "./notesSlice";
import groceryReducer from "./grocerySlice";

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    notes: notesReducer,
    grocery: groceryReducer
  }
});