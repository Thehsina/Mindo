// src/redux/mealsSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { supabase, isSupabaseConfigured, getCurrentUser } from "../supabase.js";
import { addItemFirestore } from "./grocerySlice.js";
import { parseIngredient } from "../utils/groceryHelpers.js";

export const getStartOfWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon.toISOString().slice(0, 10);
};

const DEFAULT_DEMO_MEALS = [];


const normalizeMeal = (m = {}) => ({
  id: m.id || `meal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: m.name || "Untitled Meal",
  type: (m.type || "dinner").toLowerCase(),
  day: m.day || "Monday",
  dateStr: m.dateStr || getStartOfWeek(),
  notes: m.notes || "",
  ingredients: Array.isArray(m.ingredients) ? m.ingredients.filter(Boolean) : [],
  favorite: Boolean(m.favorite),
  tags: Array.isArray(m.tags) ? m.tags : [],
  createdAt: m.createdAt || new Date().toISOString(),
});

const mealsSlice = createSlice({
  name: "meals",
  initialState: [],
  reducers: {
    setMeals: (state, action) => action.payload.map(normalizeMeal),
    addMeal: (state, action) => {
      state.push(normalizeMeal(action.payload));
    },
    updateMeal: (state, action) => {
      const idx = state.findIndex((m) => m.id === action.payload.id);
      if (idx !== -1) {
        state[idx] = normalizeMeal({ ...state[idx], ...action.payload });
      }
    },
    deleteMeal: (state, action) => state.filter((m) => m.id !== action.payload),
    toggleMealFavorite: (state, action) => {
      const meal = state.find((m) => m.id === action.payload);
      if (meal) {
        meal.favorite = !meal.favorite;
      }
    },
  },
});

export const { setMeals, addMeal, updateMeal, deleteMeal, toggleMealFavorite } = mealsSlice.actions;
export default mealsSlice.reducer;

// LocalStorage helpers
export const readLocalMeals = () => {
  try {
    const raw = localStorage.getItem("tm.meals");
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return (Array.isArray(parsed) ? parsed : []).map(normalizeMeal);
  } catch (err) {
    console.error("Error reading local meals:", err);
    return [];
  }
};

export const writeLocalMeals = (meals) => {
  try {
    localStorage.setItem("tm.meals", JSON.stringify(meals.map(normalizeMeal)));
  } catch (err) {
    console.error("Error writing local meals:", err);
  }
};

// Async thunks
export const fetchMealsFirestore = () => async (dispatch) => {
  try {
    if (!isSupabaseConfigured) {
      dispatch(setMeals(readLocalMeals()));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      dispatch(setMeals(readLocalMeals()));
      return;
    }

    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      dispatch(setMeals(readLocalMeals()));
      return;
    }

    const meals = (data || []).map((row) =>
      normalizeMeal({
        id: row.id,
        name: row.name,
        type: row.type,
        day: row.day,
        dateStr: row.date_str,
        notes: row.notes,
        ingredients: row.ingredients,
        favorite: row.favorite,
        tags: row.tags,
        createdAt: row.created_at,
      })
    );

    dispatch(setMeals(meals));
  } catch (err) {
    console.error("Failed to fetch meals:", err);
    dispatch(setMeals(readLocalMeals()));
  }
};

export const addMealFirestore = (mealData) => async (dispatch, getState) => {
  const newMeal = normalizeMeal(mealData);
  dispatch(addMeal(newMeal));
  writeLocalMeals(getState().meals);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase.from("meals").insert([
          {
            id: newMeal.id,
            user_id: user.id,
            name: newMeal.name,
            type: newMeal.type,
            day: newMeal.day,
            date_str: newMeal.dateStr,
            notes: newMeal.notes,
            ingredients: newMeal.ingredients,
            favorite: newMeal.favorite,
            tags: newMeal.tags,
          },
        ]);
      }
    } catch (err) {
      console.error("Supabase insert meal error:", err);
    }
  }
};

export const updateMealFirestore = (mealData) => async (dispatch, getState) => {
  dispatch(updateMeal(mealData));
  writeLocalMeals(getState().meals);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase
          .from("meals")
          .update({
            name: mealData.name,
            type: mealData.type,
            day: mealData.day,
            date_str: mealData.dateStr,
            notes: mealData.notes,
            ingredients: mealData.ingredients,
            favorite: mealData.favorite,
            tags: mealData.tags,
          })
          .eq("id", mealData.id)
          .eq("user_id", user.id);
      }
    } catch (err) {
      console.error("Supabase update meal error:", err);
    }
  }
};

export const deleteMealFirestore = (mealId) => async (dispatch, getState) => {
  dispatch(deleteMeal(mealId));
  writeLocalMeals(getState().meals);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase.from("meals").delete().eq("id", mealId).eq("user_id", user.id);
      }
    } catch (err) {
      console.error("Supabase delete meal error:", err);
    }
  }
};

export const toggleMealFavoriteFirestore = (mealId) => async (dispatch, getState) => {
  dispatch(toggleMealFavorite(mealId));
  writeLocalMeals(getState().meals);

  if (isSupabaseConfigured) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const meal = getState().meals.find((m) => m.id === mealId);
        if (meal) {
          await supabase
            .from("meals")
            .update({ favorite: meal.favorite })
            .eq("id", mealId)
            .eq("user_id", user.id);
        }
      }
    } catch (err) {
      console.error("Supabase favorite meal error:", err);
    }
  }
};

// CRITICAL INTEGRATION: Add meal ingredients directly to Mindo Grocery List
export const addIngredientsToGrocery = (ingredients = [], options = {}) => async (dispatch, getState) => {
  if (!Array.isArray(ingredients) || !ingredients.length) return 0;
  const existingGrocery = getState().grocery || [];
  const existingNames = new Set(existingGrocery.map((g) => (g.name || "").toLowerCase().trim()));

  let addedCount = 0;
  for (const rawIng of ingredients) {
    const parsed = parseIngredient(rawIng);
    if (!parsed || !parsed.name) continue;
    const lower = parsed.name.toLowerCase().trim();

    if (!existingNames.has(lower)) {
      existingNames.add(lower);
      addedCount++;
      await dispatch(
        addItemFirestore({
          name: parsed.name,
          quantity: parsed.rawQtyStr || options.quantity || "1",
          category: options.category || "Produce",
          bucketLabel: options.bucketLabel || "This Week",
          listType: "weekly",
          completed: false,
        })
      );
    }
  }

  return addedCount;
};
