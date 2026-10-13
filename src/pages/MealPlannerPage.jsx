// src/pages/MealPlannerPage.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMealsFirestore,
  addMealFirestore,
  updateMealFirestore,
  deleteMealFirestore,
} from "../redux/mealsSlice";
import { fetchGroceryFirestore, addItemFirestore } from "../redux/grocerySlice";
import { generateWeeklyGroceryItems, parseIngredient } from "../utils/groceryHelpers";
import { suggestIngredients } from "../services/aiIngredientService";
import {
  Utensils,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Trash2,
  Edit2,
  X,
  Check,
  Wand2,
  RotateCw,
} from "lucide-react";
import { formatLocalDate, getWeekDates, formatWeekRangeString } from "../utils/dateUtils";

const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast", icon: "☀" },
  { id: "lunch", label: "Lunch", icon: "🍱" },
  { id: "dinner", label: "Dinner", icon: "🌙" },
  { id: "snack", label: "Snack", icon: "🍎" },
];

const DAYS_OF_WEEK = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
];

const QUICK_MEALS = [
  "Oatmeal + berries",
  "Chicken rice",
  "Chicken pasta",
  "Vegetable wrap",
  "Grilled salmon",
  "Egg sandwich",
  "Rice and curry",
  "Fruit smoothie",
];

export default function MealPlannerPage() {
  const dispatch = useDispatch();
  const meals = useSelector((state) => state.meals || []);
  const groceryItems = useSelector((state) => state.grocery || []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMobileDay, setSelectedMobileDay] = useState("Monday");

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [targetDate, setTargetDate] = useState("");
  const [targetDay, setTargetDay] = useState("Monday");
  const [targetType, setTargetType] = useState("dinner");
  const [mealName, setMealName] = useState("");
  const [ingredientsList, setIngredientsList] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const [suggestedForMealName, setSuggestedForMealName] = useState("");

  // Request ID ref to prevent async race conditions
  const suggestionRequestIdRef = useRef(0);

  // Delete confirmation modal state
  const [deletingMeal, setDeletingMeal] = useState(null);

  // Centralized Grocery List Modal state
  const [showGroceryModal, setShowGroceryModal] = useState(false);
  const [groceryChecklist, setGroceryChecklist] = useState([]);
  const [customGroceryName, setCustomGroceryName] = useState("");
  const [customGroceryQty, setCustomGroceryQty] = useState("1");
  const [toastMessage, setToastMessage] = useState("");

  const todayIndex = (new Date().getDay() + 6) % 7;
  const todayDayName = DAYS_OF_WEEK[todayIndex].full;
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekRangeLabel = useMemo(
    () => formatWeekRangeString(weekDates, weekOffset),
    [weekDates, weekOffset]
  );

  const currentWeekDateStrings = useMemo(
    () => new Set(weekDates.map((d) => formatLocalDate(d))),
    [weekDates]
  );
  const weekStartStr = useMemo(() => formatLocalDate(weekDates[0]), [weekDates]);

  useEffect(() => {
    dispatch(fetchMealsFirestore());
    dispatch(fetchGroceryFirestore());
  }, [dispatch]);

  // Set default mobile selected day to Today if current week
  useEffect(() => {
    if (weekOffset === 0) {
      setSelectedMobileDay(todayDayName);
    }
  }, [weekOffset, todayDayName]);

  // Filter meals strictly for the currently viewed week
  const currentWeekMeals = useMemo(() => {
    return meals.filter((m) => {
      // 1. Direct match with any date in the selected week
      if (m.dateStr && currentWeekDateStrings.has(m.dateStr)) return true;
      // 2. Legacy week-start match: saved with Monday date of this week
      if (m.dateStr && m.dateStr === weekStartStr && m.day) {
        return DAYS_OF_WEEK.some((d) => d.full.toLowerCase() === m.day.toLowerCase());
      }
      // 3. Fallback for undated legacy meals ONLY in current week (weekOffset === 0)
      if (!m.dateStr && weekOffset === 0 && m.day) {
        return DAYS_OF_WEEK.some((d) => d.full.toLowerCase() === m.day.toLowerCase());
      }
      return false;
    });
  }, [meals, currentWeekDateStrings, weekStartStr, weekOffset]);

  // Precise helper to find the meal planned for a specific day and meal type
  const getMealForSlot = (dateObj, dayName, typeId) => {
    if (!dateObj) return null;
    const targetDateStr = formatLocalDate(dateObj);
    const targetTypeClean = (typeId || "").toLowerCase();

    // 1. Direct calendar date match (highest priority)
    const directMatch = meals.find(
      (m) =>
        m.dateStr === targetDateStr &&
        (m.type || "").toLowerCase() === targetTypeClean
    );
    if (directMatch) return directMatch;

    // 2. Legacy week-start match: saved with Monday date of this week
    const weekStartMonday = formatLocalDate(weekDates[0]);
    const legacyWeekMatch = meals.find(
      (m) =>
        m.dateStr === weekStartMonday &&
        (m.day || "").toLowerCase() === dayName.toLowerCase() &&
        (m.type || "").toLowerCase() === targetTypeClean
    );
    if (legacyWeekMatch) return legacyWeekMatch;

    // 3. Fallback for undated legacy meals ONLY in current week (weekOffset === 0)
    if (weekOffset === 0) {
      const legacyUndated = meals.find(
        (m) =>
          !m.dateStr &&
          (m.day || "").toLowerCase() === dayName.toLowerCase() &&
          (m.type || "").toLowerCase() === targetTypeClean
      );
      if (legacyUndated) return legacyUndated;
    }

    return null;
  };

  // AI Ingredient Suggestions Fetcher with Request ID Race Condition Protection
  const handleFetchIngredientsSuggestions = async (dishName) => {
    const cleanDish = (dishName || "").trim();
    if (!cleanDish || cleanDish.length < 2) return;

    const reqId = ++suggestionRequestIdRef.current;
    setIsSuggesting(true);
    setSuggestionError("");

    try {
      const res = await suggestIngredients(cleanDish);

      if (suggestionRequestIdRef.current !== reqId) {
        return;
      }

      if (res && Array.isArray(res.ingredients) && res.ingredients.length > 0) {
        const formatted = res.ingredients.map((ing, idx) => ({
          id: `ing-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: ing.name || "",
          quantity: ing.quantity !== undefined && ing.quantity !== null ? String(ing.quantity) : "",
          unit: ing.unit || "",
        }));

        setIngredientsList(formatted);
        setSuggestedForMealName(cleanDish);
      } else {
        setIngredientsList([]);
        setSuggestionError(`Unable to suggest ingredients for "${cleanDish}". Add them manually below.`);
      }
    } catch (err) {
      console.error("[Meal AI UI] Failed to suggest ingredients:", err);
      if (suggestionRequestIdRef.current === reqId) {
        setSuggestionError("Couldn't suggest ingredients right now. You can add them manually.");
      }
    } finally {
      if (suggestionRequestIdRef.current === reqId) {
        setIsSuggesting(false);
      }
    }
  };

  // Debounced Auto-Suggestion trigger when user stops typing dish name
  useEffect(() => {
    if (!showAddModal) return;
    const trimmed = mealName.trim();
    if (trimmed.length < 2) return;
    if (trimmed === suggestedForMealName) return;

    const timer = setTimeout(() => {
      handleFetchIngredientsSuggestions(trimmed);
    }, 650);

    return () => clearTimeout(timer);
  }, [mealName, showAddModal, suggestedForMealName]);

  const updateIngredientField = (id, field, value) => {
    setIngredientsList((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const removeIngredientRow = (id) => {
    setIngredientsList((prev) => prev.filter((ing) => ing.id !== id));
  };

  const handleAddEmptyIngredientRow = () => {
    setIngredientsList((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
        quantity: "1",
        unit: "",
      },
    ]);
  };

  const handleSelectTargetDay = (dayFull) => {
    setTargetDay(dayFull);
    const dayIdx = DAYS_OF_WEEK.findIndex((d) => d.full === dayFull);
    if (dayIdx >= 0 && weekDates[dayIdx]) {
      setTargetDate(formatLocalDate(weekDates[dayIdx]));
    }
  };

  const openAddModal = (
    dateStrOrDay = null,
    dayOrType = "Monday",
    typeId = "dinner",
    mealObj = null
  ) => {
    suggestionRequestIdRef.current++;
    setIsSuggesting(false);
    setSuggestionError("");

    let resolvedDateStr = formatLocalDate(new Date());
    let resolvedDayFull = "Monday";
    let resolvedType = "dinner";
    let editingItem = null;

    if (dateStrOrDay && typeof dateStrOrDay === "object" && dateStrOrDay.name) {
      editingItem = dateStrOrDay;
      resolvedDateStr = editingItem.dateStr || formatLocalDate(new Date());
      resolvedDayFull = editingItem.day || "Monday";
      resolvedType = editingItem.type || "dinner";
    } else {
      if (typeof dateStrOrDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStrOrDay)) {
        resolvedDateStr = dateStrOrDay;
        resolvedDayFull = typeof dayOrType === "string" ? dayOrType : "Monday";
        if (typeof typeId === "string") {
          resolvedType = typeId;
          editingItem = mealObj;
        } else if (typeId && typeof typeId === "object") {
          editingItem = typeId;
          resolvedType = editingItem.type || "dinner";
        }
      } else if (typeof dateStrOrDay === "string") {
        resolvedDayFull = dateStrOrDay;
        resolvedType = typeof dayOrType === "string" ? dayOrType : "dinner";
        editingItem = typeId && typeof typeId === "object" ? typeId : mealObj;
        const dIdx = DAYS_OF_WEEK.findIndex((d) => d.full.toLowerCase() === resolvedDayFull.toLowerCase());
        if (dIdx >= 0 && weekDates[dIdx]) {
          resolvedDateStr = formatLocalDate(weekDates[dIdx]);
        }
      } else {
        if (weekDates[0]) {
          resolvedDateStr = formatLocalDate(weekDates[0]);
          resolvedDayFull = DAYS_OF_WEEK[0].full;
        }
      }
    }

    if (editingItem) {
      setEditingMeal(editingItem);
      setTargetDate(editingItem.dateStr || resolvedDateStr);
      setTargetDay(editingItem.day || resolvedDayFull);
      setTargetType((editingItem.type || resolvedType).toLowerCase());
      setMealName(editingItem.name || "");
      setSuggestedForMealName(editingItem.name || "");

      if (Array.isArray(editingItem.ingredients)) {
        const parsed = editingItem.ingredients
          .map((ingItem, idx) => {
            const p = parseIngredient(ingItem);
            if (!p) return null;
            return {
              id: `ing-edit-${Date.now()}-${idx}`,
              name: p.name,
              quantity: p.quantity !== null ? String(p.quantity) : "",
              unit: p.unit || "",
            };
          })
          .filter(Boolean);
        setIngredientsList(parsed);
      } else {
        setIngredientsList([]);
      }
    } else {
      setEditingMeal(null);
      setTargetDate(resolvedDateStr);
      setTargetDay(resolvedDayFull);
      setTargetType(resolvedType.toLowerCase());
      setMealName("");
      setIngredientsList([]);
      setSuggestedForMealName("");
    }
    setShowAddModal(true);
  };

  const handleSaveMeal = () => {
    if (!mealName.trim()) return;

    const validIngredients = ingredientsList
      .filter((ing) => ing.name && ing.name.trim())
      .map((ing) => ({
        name: ing.name.trim(),
        quantity: ing.quantity ? String(ing.quantity).trim() : "",
        unit: ing.unit ? String(ing.unit).trim() : "",
      }));

    const finalDateStr = targetDate || formatLocalDate(new Date());

    const payload = {
      id: editingMeal ? editingMeal.id : undefined,
      name: mealName.trim(),
      type: targetType.toLowerCase(),
      day: targetDay,
      dateStr: finalDateStr, // Exact calendar date of this meal!
      ingredients: validIngredients,
    };

    if (editingMeal) {
      dispatch(updateMealFirestore(payload));
      setToastMessage("Meal updated");
    } else {
      // Check if there is already an existing meal for this exact calendar date and type
      const existing = meals.find(
        (m) =>
          m.dateStr === finalDateStr &&
          (m.type || "").toLowerCase() === targetType.toLowerCase()
      );
      if (existing) {
        dispatch(updateMealFirestore({ ...payload, id: existing.id }));
        setToastMessage("Meal updated");
      } else {
        dispatch(addMealFirestore(payload));
        setToastMessage("Meal added to plan");
      }
    }

    setShowAddModal(false);
    setTimeout(() => setToastMessage(""), 2500);
  };

  const handleDeleteMeal = () => {
    if (!deletingMeal) return;
    dispatch(deleteMealFirestore(deletingMeal.id));
    setDeletingMeal(null);
    setToastMessage("Meal removed");
    setTimeout(() => setToastMessage(""), 2500);
  };

  const handleOpenCentralGroceryModal = () => {
    const aggregated = generateWeeklyGroceryItems(currentWeekMeals);
    setGroceryChecklist(aggregated);
    setCustomGroceryName("");
    setCustomGroceryQty("1");
    setShowGroceryModal(true);
  };

  const handleToggleGroceryItem = (id) => {
    setGroceryChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleUpdateGroceryQty = (id, newQty) => {
    setGroceryChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayQty: newQty } : item))
    );
  };

  const handleDeleteGroceryChecklistItem = (id) => {
    setGroceryChecklist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddCustomGroceryItem = () => {
    if (!customGroceryName.trim()) return;
    setGroceryChecklist((prev) => [
      ...prev,
      {
        id: `custom-ing-${Date.now()}`,
        name: customGroceryName.trim(),
        displayQty: customGroceryQty.trim() || "1",
        sources: ["Custom item"],
        count: 1,
        checked: true,
      },
    ]);
    setCustomGroceryName("");
    setCustomGroceryQty("1");
  };

  const handlePushSelectedToMindoGrocery = async () => {
    const selected = groceryChecklist.filter((item) => item.checked);
    if (!selected.length) return;

    let addedCount = 0;
    const existingNames = new Set(
      groceryItems.map((g) => (g.name || "").toLowerCase().trim())
    );

    for (const item of selected) {
      const trimmed = item.name.trim();
      const lower = trimmed.toLowerCase();

      if (!existingNames.has(lower)) {
        existingNames.add(lower);
        addedCount++;
        await dispatch(
          addItemFirestore({
            name: trimmed,
            quantity: item.displayQty || "1",
            category: "Produce",
            bucketLabel: "This Week",
            listType: "weekly",
            completed: false,
          })
        );
      }
    }

    setToastMessage(`Added ${addedCount} item(s) to Grocery!`);
    setShowGroceryModal(false);
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full gap-2 sm:gap-2.5 overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 animate-bounce">
          <Check className="w-3.5 h-3.5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. COMPACT UNIFIED HEADER */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Top bar on mobile / Left on desktop: Title + Mobile Action buttons */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                Meal Planner
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-none mt-0.5 whitespace-nowrap">
                Weekly schedule & ingredients
              </p>
            </div>
          </div>

          {/* Action buttons on mobile (Grocery & Add Meal) */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenCentralGroceryModal}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Generate Grocery List"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Grocery</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.full === selectedMobileDay);
                const dObj = DAYS_OF_WEEK[dayIndex >= 0 ? dayIndex : 0];
                const dateForDay = weekDates[dayIndex >= 0 ? dayIndex : 0];
                const dateStrForDay = dateForDay ? formatLocalDate(dateForDay) : formatLocalDate(new Date());
                openAddModal(dateStrForDay, dObj.full, "breakfast");
              }}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-500 active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Right Actions on desktop / Bottom Row on mobile: Week Controls (+ Desktop Action buttons) */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0">
          {/* Week Selector Pill */}
          <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-1 rounded-xl bg-white dark:bg-[#121214] border border-slate-200/80 dark:border-slate-800 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Previous week"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-1 text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
              {weekRangeLabel}
            </span>

            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
              title="Next week"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
              >
                Today
              </button>
            )}
          </div>

          {/* Action buttons on desktop */}
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Grocery List Central Action */}
            <button
              type="button"
              onClick={handleOpenCentralGroceryModal}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Generate Grocery List"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Grocery List</span>
            </button>

            {/* Add Meal Button */}
            <button
              type="button"
              onClick={() => {
                const todayIdx = DAYS_OF_WEEK.findIndex((d) => d.full === todayDayName);
                const idx = (weekOffset === 0 && todayIdx >= 0) ? todayIdx : 0;
                const dObj = DAYS_OF_WEEK[idx];
                const dateForDay = weekDates[idx];
                const dateStrForDay = dateForDay ? formatLocalDate(dateForDay) : formatLocalDate(new Date());
                openAddModal(dateStrForDay, dObj.full, "breakfast");
              }}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-indigo-500 active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>Add Meal</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN BENTO CONTAINER */}
      <div className="bento-card !p-2 sm:!p-3 rounded-2xl flex-1 min-h-0 flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121214] shadow-2xs">
        {/* MOBILE 7-DAY SEGMENTED PILLS (Fitted 7-col grid on mobile) */}
        <div className="grid grid-cols-7 gap-1 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0 md:hidden">
          {DAYS_OF_WEEK.map((d, idx) => {
            const isSelected = selectedMobileDay === d.full;
            const isToday = d.full === todayDayName && weekOffset === 0;
            const dateForDay = weekDates[idx];

            return (
              <button
                key={d.full}
                type="button"
                onClick={() => setSelectedMobileDay(d.full)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl text-center transition cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-2xs font-bold"
                    : isToday
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
                }`}
              >
                <span className="text-[11px] leading-none">{d.short}</span>
                {dateForDay && (
                  <span className={`text-[9px] mt-0.5 leading-none ${isSelected ? "text-white/80" : "text-slate-400"}`}>
                    {dateForDay.getDate()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* MOBILE SINGLE-DAY VIEW (Compact, scrollable without wasted margins) */}
        <div className="block md:hidden flex-1 min-h-0 overflow-y-auto space-y-2 pt-2 no-scrollbar">
          {(() => {
            const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.full === selectedMobileDay);
            const dObj = DAYS_OF_WEEK[dayIndex >= 0 ? dayIndex : 0];
            const dateForDay = weekDates[dayIndex >= 0 ? dayIndex : 0];
            const isToday = dObj.full === todayDayName && weekOffset === 0;

            return (
              <div className="flex flex-col space-y-2">
                {/* Day Header Strip */}
                <div className="flex items-center justify-between px-1 text-slate-900 dark:text-white">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {dObj.full}
                    </span>
                    {dateForDay && (
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        · {dateForDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  {isToday && (
                    <span className="text-[9px] font-extrabold uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
                      Today
                    </span>
                  )}
                </div>

                {/* 4 Compact Meal Slots */}
                <div className="space-y-1.5">
                  {MEAL_TYPES.map((mType) => {
                    const existingMeal = getMealForSlot(dateForDay, dObj.full, mType.id);
                    const slotDateStr = dateForDay ? formatLocalDate(dateForDay) : formatLocalDate(new Date());

                    return (
                      <div
                        key={mType.id}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2 sm:p-2.5 dark:border-slate-800/80 dark:bg-[#16171a] shadow-2xs relative"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                              <span>{mType.icon}</span>
                              <span>{mType.label}</span>
                            </span>

                            {existingMeal ? (
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {existingMeal.name}
                              </span>
                            ) : null}
                          </div>

                          {existingMeal ? (
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openAddModal(slotDateStr, dObj.full, mType.id, existingMeal)}
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Edit meal"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingMeal(existingMeal)}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                                title="Delete meal"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAddModal(slotDateStr, dObj.full, mType.id)}
                              className="py-1 px-2.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/10 transition cursor-pointer flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>

                        {/* Ingredients preview chip if exists */}
                        {existingMeal && Array.isArray(existingMeal.ingredients) && existingMeal.ingredients.length > 0 && (
                          <div className="mt-1 pl-1 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                            <span>🥗</span>
                            <span className="truncate">
                              {existingMeal.ingredients.map((ing) => (typeof ing === "string" ? ing : ing.name)).filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* DESKTOP WEEKLY PLANNER TABLE (Full height, balanced columns, internal scroll) */}
        <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-y-auto no-scrollbar">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="py-2 px-2.5 w-[14%]">Day</th>
                {MEAL_TYPES.map((m) => (
                  <th key={m.id} className="py-2 px-2 w-[21.5%]">
                    <span className="flex items-center gap-1">
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {DAYS_OF_WEEK.map((dObj, idx) => {
                const dayFull = dObj.full;
                const dateForDay = weekDates[idx];
                const isToday = dayFull === todayDayName && weekOffset === 0;

                return (
                  <tr
                    key={dayFull}
                    className={`transition-colors ${
                      isToday
                        ? "bg-indigo-50/35 dark:bg-indigo-500/10"
                        : "hover:bg-slate-50/50 dark:hover:bg-[#1a1a1e]/30"
                    }`}
                  >
                    {/* Day Label Cell */}
                    <td className="py-2 px-2.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        <div>
                          <span
                            className={`text-xs font-extrabold uppercase tracking-wider block leading-none ${
                              isToday
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {dObj.short}
                          </span>
                          {dateForDay && (
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 block mt-0.5">
                              {dateForDay.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        {isToday && (
                          <span className="text-[8px] font-extrabold uppercase bg-indigo-600 text-white px-1.5 py-0.5 rounded-md">
                            Today
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Meal Columns */}
                    {MEAL_TYPES.map((mType) => {
                      const existingMeal = getMealForSlot(dateForDay, dayFull, mType.id);
                      const slotDateStr = dateForDay ? formatLocalDate(dateForDay) : formatLocalDate(new Date());

                      return (
                        <td key={mType.id} className="py-1.5 px-2 align-middle">
                          {existingMeal ? (
                            <div className="group relative rounded-xl border border-slate-200/80 bg-white p-1.5 sm:p-2 dark:border-slate-800 dark:bg-[#121214] flex items-center justify-between gap-1 shadow-2xs hover:border-indigo-400/50 transition">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate flex-1 leading-snug">
                                {existingMeal.name}
                              </span>

                              {/* Compact inline Edit & Delete icons inside cell */}
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openAddModal(slotDateStr, dayFull, mType.id, existingMeal)}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit meal"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingMeal(existingMeal)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                                  title="Delete meal"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAddModal(slotDateStr, dayFull, mType.id)}
                              className="w-full py-1.5 px-2 rounded-xl border border-dashed border-slate-200/90 dark:border-slate-800 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition cursor-pointer flex items-center justify-center gap-1 group/btn"
                            >
                              <Plus className="w-3 h-3 transition-transform group-hover/btn:scale-110" />
                              <span>Add meal</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAST ADD / EDIT MEAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div
            className="w-[calc(100vw-24px)] max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingMeal ? "Edit Meal" : "Add a meal"}
                </h2>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {targetDay} · {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
                  {targetDate ? ` · ${targetDate}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 py-3">
              {/* DAY CHIPS SELECTOR */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Day
                </label>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {DAYS_OF_WEEK.map((d, dIdx) => {
                    const isSel = targetDay === d.full;
                    const dDate = weekDates[dIdx];
                    return (
                      <button
                        key={d.full}
                        type="button"
                        onClick={() => handleSelectTargetDay(d.full)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                          isSel
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {d.short}
                        {dDate ? (
                          <span className={`text-[10px] ml-1 font-medium ${isSel ? "text-white/80" : "text-slate-400"}`}>
                            {dDate.getDate()}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MEAL TYPE CHIPS SELECTOR */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Meal Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MEAL_TYPES.map((m) => {
                    const isSel = targetType === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTargetType(m.id)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                          isSel
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* WHAT ARE YOU HAVING? */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  What are you having?
                </label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveMeal();
                    }
                  }}
                  placeholder="e.g. Oatmeal + banana, Grilled chicken"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  autoFocus
                />

                {/* Quick suggestions */}
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Quick ideas
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_MEALS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setMealName(idea)}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px] font-semibold hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition cursor-pointer"
                      >
                        + {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI INGREDIENTS SECTION */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-indigo-500" /> Ingredients
                  </span>
                  {mealName.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleFetchIngredientsSuggestions(mealName)}
                      disabled={isSuggesting}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <RotateCw className={`w-3 h-3 ${isSuggesting ? "animate-spin" : ""}`} />
                      <span>{ingredientsList.length > 0 ? "Suggest again" : "Suggest"}</span>
                    </button>
                  )}
                </div>

                {/* Loading state */}
                {isSuggesting && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/30 p-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 animate-pulse">
                    <Wand2 className="w-3.5 h-3.5 animate-spin text-indigo-500 shrink-0" />
                    <span>Finding ingredients for "{mealName}"...</span>
                  </div>
                )}

                {/* Error state */}
                {suggestionError && !isSuggesting && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-2 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
                    <span>{suggestionError}</span>
                    <button
                      type="button"
                      onClick={() => setSuggestionError("")}
                      className="text-[10px] font-bold hover:underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Suggested/Editable Ingredients List */}
                {!isSuggesting && ingredientsList.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1 py-1 no-scrollbar">
                    {ingredientsList.map((ing) => (
                      <div
                        key={ing.id}
                        className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#1a1a1e]"
                      >
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => updateIngredientField(ing.id, "name", e.target.value)}
                          placeholder="Ingredient name"
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={ing.quantity}
                          onChange={(e) => updateIngredientField(ing.id, "quantity", e.target.value)}
                          placeholder="Qty"
                          className="w-10 sm:w-12 rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-center text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white shrink-0"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) => updateIngredientField(ing.id, "unit", e.target.value)}
                          placeholder="Unit"
                          className="w-11 sm:w-14 rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-center text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(ing.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer shrink-0"
                          title="Remove ingredient"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!isSuggesting && ingredientsList.length === 0 && !suggestionError && (
                  <div className="text-[10px] text-slate-400 italic py-0.5">
                    Type a dish name above to auto-suggest ingredients, or add manually below.
                  </div>
                )}

                {/* Add Custom Ingredient Button */}
                <button
                  type="button"
                  onClick={handleAddEmptyIngredientRow}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add ingredient</span>
                </button>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMeal}
                disabled={!mealName.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-2xs"
              >
                {editingMeal ? "Save Changes" : "Add Meal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div
            className="w-[calc(100vw-24px)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-[#121214]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Delete this meal?
            </h2>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
              {deletingMeal.name}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setDeletingMeal(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMeal}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-2xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTRALIZED WEEKLY GROCERY LIST MODAL */}
      {showGroceryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div
            className="w-[calc(100vw-24px)] max-w-lg rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  Weekly Grocery List
                </h2>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Ingredients collected from planned meals for this week
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGroceryModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Checklist items */}
            <div className="space-y-2 py-3 max-h-72 overflow-y-auto pr-1 no-scrollbar">
              {groceryChecklist.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No ingredients found for planned meals this week. You can add items below manually.
                </div>
              ) : (
                groceryChecklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-2 text-xs font-semibold dark:border-slate-800 dark:bg-[#1a1a1e] gap-2"
                  >
                    <div
                      onClick={() => handleToggleGroceryItem(item.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    >
                      <div
                        className={`h-4.5 w-4.5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 transition ${
                          item.checked
                            ? "bg-indigo-600 text-white"
                            : "border border-slate-300 dark:border-slate-700 text-transparent"
                        }`}
                      >
                        ✓
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`block truncate ${item.checked ? "text-slate-900 dark:text-white" : "line-through text-slate-400"}`}>
                          {item.name}
                        </span>
                        {item.sources && item.sources.length > 0 && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal block truncate">
                            From: {item.sources.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Editable Quantity */}
                    <input
                      type="text"
                      value={item.displayQty}
                      onChange={(e) => handleUpdateGroceryQty(item.id, e.target.value)}
                      className="w-16 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-center text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0"
                    />

                    {/* Delete item */}
                    <button
                      type="button"
                      onClick={() => handleDeleteGroceryChecklistItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}

              {/* Add Custom Ingredient Row */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <input
                  type="text"
                  value={customGroceryName}
                  onChange={(e) => setCustomGroceryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomGroceryItem();
                    }
                  }}
                  placeholder="Add custom item..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                />
                <input
                  type="text"
                  value={customGroceryQty}
                  onChange={(e) => setCustomGroceryQty(e.target.value)}
                  placeholder="Qty"
                  className="w-14 rounded-xl border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-semibold text-center text-slate-900 outline-none dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomGroceryItem}
                  disabled={!customGroceryName.trim()}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowGroceryModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePushSelectedToMindoGrocery}
                disabled={!groceryChecklist.some((i) => i.checked)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-2xs"
              >
                Add to Grocery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
