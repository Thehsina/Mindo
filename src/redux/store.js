// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import tasksReducer from "./tasksSlice";
import notesReducer from "./notesSlice";
import groceryReducer from "./grocerySlice";
import habitsReducer from "./habitsSlice";
import mealsReducer from "./mealsSlice";
import expensesReducer from "./expensesSlice";

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    notes: notesReducer,
    grocery: groceryReducer,
    habits: habitsReducer,
    meals: mealsReducer,
    expenses: expensesReducer,
  },
});