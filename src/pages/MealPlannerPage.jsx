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
  Sparkles,
  RotateCw,
} from "lucide-react";

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

const getWeekDates = (weekOffset = 0) => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + weekOffset * 7;
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    dates.push(cur);
  }
  return dates;
};

const formatWeekRangeString = (dates, weekOffset) => {
  if (!dates || dates.length < 7) return "";
  const start = dates[0];
  const end = dates[6];

  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();

  const rangeStr =
    startMonth === endMonth
      ? `${startMonth} ${startDay}–${endDay}`
      : `${startMonth} ${startDay} – ${endMonth} ${endDay}`;

  if (weekOffset === 0) return `This Week · ${rangeStr}`;
  if (weekOffset === -1) return `Last Week · ${rangeStr}`;
  if (weekOffset === 1) return `Next Week · ${rangeStr}`;
  return rangeStr;
};

export default function MealPlannerPage() {
  const dispatch = useDispatch();
  const meals = useSelector((state) => state.meals || []);
  const groceryItems = useSelector((state) => state.grocery || []);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedMobileDay, setSelectedMobileDay] = useState("Monday");

  // Add / Edit Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
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

  // Filter meals for current week
  const currentWeekMeals = useMemo(() => {
    return meals.filter((m) =>
      DAYS_OF_WEEK.some((d) => (m.day || "").toLowerCase() === d.full.toLowerCase())
    );
  }, [meals]);

  // AI Ingredient Suggestions Fetcher with Request ID Race Condition Protection
  const handleFetchIngredientsSuggestions = async (dishName, forceRegenerate = false) => {
    const cleanDish = (dishName || "").trim();
    if (!cleanDish || cleanDish.length < 2) return;

    const reqId = ++suggestionRequestIdRef.current;
    console.log(`[Meal AI UI] Input meal: "${cleanDish}" (Request ID: ${reqId})`);

    setIsSuggesting(true);
    setSuggestionError("");

    try {
      const res = await suggestIngredients(cleanDish);

      // Protect against stale async response race conditions
      if (suggestionRequestIdRef.current !== reqId) {
        console.log(`[Meal AI UI] Ignored stale response for "${cleanDish}" (Req ID ${reqId} != ${suggestionRequestIdRef.current})`);
        return;
      }

      if (res && Array.isArray(res.ingredients) && res.ingredients.length > 0) {
        const formatted = res.ingredients.map((ing, idx) => ({
          id: `ing-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          name: ing.name || "",
          quantity: ing.quantity !== undefined && ing.quantity !== null ? String(ing.quantity) : "",
          unit: ing.unit || "",
        }));

        console.log(`[Meal AI UI] Final UI ingredients for "${cleanDish}":`, formatted);
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

  const openAddModal = (dayFull = "Monday", typeId = "dinner", mealObj = null) => {
    // Increment request ID to cancel any in-flight suggestion requests
    suggestionRequestIdRef.current++;
    setIsSuggesting(false);
    setSuggestionError("");

    if (mealObj) {
      setEditingMeal(mealObj);
      setTargetDay(mealObj.day || dayFull);
      setTargetType((mealObj.type || typeId).toLowerCase());
      setMealName(mealObj.name || "");
      setSuggestedForMealName(mealObj.name || "");

      // Normalize existing ingredients into array
      if (Array.isArray(mealObj.ingredients)) {
        const parsed = mealObj.ingredients
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
      setTargetDay(dayFull);
      setTargetType(typeId.toLowerCase());
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

    const payload = {
      id: editingMeal ? editingMeal.id : undefined,
      name: mealName.trim(),
      type: targetType,
      day: targetDay,
      dateStr: weekDates[0].toISOString().slice(0, 10),
      ingredients: validIngredients,
    };

    if (editingMeal) {
      dispatch(updateMealFirestore(payload));
      setToastMessage("Meal updated");
    } else {
      dispatch(addMealFirestore(payload));
      setToastMessage("Meal added to plan");
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

  // Centralized Grocery Action: Collect all ingredients for the selected week
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

    setToastMessage(`Added ${addedCount} item(s) to Mindo Grocery!`);
    setShowGroceryModal(false);
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <div className="animate-fade-in-up flex flex-col h-full min-h-0 space-y-4 max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 leading-none">
            <Utensils className="w-5.5 h-5.5 text-indigo-500" />
            Meal Planner
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            Plan your meals for the week.
          </p>
        </div>

        {/* Centralized Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenCentralGroceryModal}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 hover:border-indigo-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-400 transition active:scale-[0.98] cursor-pointer shadow-2xs"
          >
            <ShoppingBag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>🛒 Grocery List</span>
          </button>

          <button
            type="button"
            onClick={() => openAddModal(todayDayName, "breakfast")}
            className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Meal</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden max-w-full">
        <div className="bento-card flex-1 min-h-0 flex flex-col !p-4 sm:!p-5 overflow-hidden">
          {/* WEEK NAVIGATION HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0 border-b border-slate-100 dark:border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                WEEKLY PLANNER
              </span>
            </div>

            {/* Week Controls */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Previous week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[160px] text-center">
                {weekRangeLabel}
              </span>

              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Next week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* MOBILE DAY SELECTOR TABS */}
          <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3 shrink-0 border-b border-slate-100 dark:border-slate-800">
            {DAYS_OF_WEEK.map((d) => {
              const isSelected = selectedMobileDay === d.full;
              const isToday = d.full === todayDayName && weekOffset === 0;

              return (
                <button
                  key={d.full}
                  type="button"
                  onClick={() => setSelectedMobileDay(d.full)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : isToday
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {d.short}
                </button>
              );
            })}
          </div>

          {/* DESKTOP WEEKLY PLANNER TABLE (100% width, NO horizontal scrollbar) */}
          <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-y-auto">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="py-2.5 px-3 w-[16%]">Day</th>
                  {MEAL_TYPES.map((m) => (
                    <th key={m.id} className="py-2.5 px-2.5 w-[21%]">
                      <span className="flex items-center gap-1.5">
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
                          ? "bg-indigo-50/40 dark:bg-indigo-500/10"
                          : "hover:bg-slate-50/60 dark:hover:bg-[#1a1a1e]/40"
                      }`}
                    >
                      {/* Day Label Cell */}
                      <td className="py-2.5 px-3 align-middle">
                        <div className="flex items-center gap-2">
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
                        const existingMeal = meals.find(
                          (m) =>
                            (m.day || "").toLowerCase() === dayFull.toLowerCase() &&
                            (m.type || "").toLowerCase() === mType.id.toLowerCase()
                        );

                        return (
                          <td key={mType.id} className="py-2 px-2 align-middle">
                            {existingMeal ? (
                              <div className="group relative rounded-xl border border-slate-200/80 bg-white p-2 dark:border-slate-800 dark:bg-[#121214] flex items-center justify-between gap-1 shadow-2xs">
                                <span className="text-xs font-bold text-slate-900 dark:text-white truncate flex-1 leading-snug">
                                  {existingMeal.name}
                                </span>

                                {/* Compact inline Edit & Delete icons inside cell */}
                                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openAddModal(dayFull, mType.id, existingMeal)}
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
                                onClick={() => openAddModal(dayFull, mType.id)}
                                className="w-full py-1.5 px-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition cursor-pointer flex items-center justify-center gap-1 group/btn"
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

          {/* MOBILE SINGLE-DAY VIEW */}
          <div className="block md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
            {(() => {
              const dayIndex = DAYS_OF_WEEK.findIndex((d) => d.full === selectedMobileDay);
              const dObj = DAYS_OF_WEEK[dayIndex >= 0 ? dayIndex : 0];
              const dateForDay = weekDates[dayIndex >= 0 ? dayIndex : 0];
              const isToday = dObj.full === todayDayName && weekOffset === 0;

              return (
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                        {dObj.full}
                      </span>
                      {dateForDay && (
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                          · {dateForDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-extrabold uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-md">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {MEAL_TYPES.map((mType) => {
                      const existingMeal = meals.find(
                        (m) =>
                          (m.day || "").toLowerCase() === dObj.full.toLowerCase() &&
                          (m.type || "").toLowerCase() === mType.id.toLowerCase()
                      );

                      return (
                        <div
                          key={mType.id}
                          className="rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-[#121214] shadow-xs relative"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>{mType.icon}</span>
                              <span>{mType.label}</span>
                            </span>

                            {existingMeal && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openAddModal(dObj.full, mType.id, existingMeal)}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingMeal(existingMeal)}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {existingMeal ? (
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {existingMeal.name}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openAddModal(dObj.full, mType.id)}
                              className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add meal</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* FAST ADD / EDIT MEAL MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-xs">
          <div
            className="w-[calc(100vw-24px)] max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingMeal ? "Edit Meal" : "Add a meal"}
                </h2>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {targetDay} · {targetType.charAt(0).toUpperCase() + targetType.slice(1)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              {/* DAY CHIPS SELECTOR */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Day
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {DAYS_OF_WEEK.map((d) => {
                    const isSel = targetDay === d.full;
                    return (
                      <button
                        key={d.full}
                        type="button"
                        onClick={() => setTargetDay(d.full)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                          isSel
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MEAL TYPE CHIPS SELECTOR */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Meal
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MEAL_TYPES.map((m) => {
                    const isSel = targetType === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setTargetType(m.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                          isSel
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
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
                  placeholder="e.g. Oatmeal + banana, Chicken pasta"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                  autoFocus
                />

                {/* Quick suggestions */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                    Quick ideas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_MEALS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setMealName(idea)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 transition cursor-pointer"
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
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Ingredients
                  </span>
                  {mealName.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleFetchIngredientsSuggestions(mealName, true)}
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
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/30 p-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />
                    <span>Finding ingredients for "{mealName}"...</span>
                  </div>
                )}

                {/* Error state */}
                {suggestionError && !isSuggesting && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-between">
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
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 py-1">
                    {ingredientsList.map((ing) => (
                      <div
                        key={ing.id}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-[#1a1a1e]"
                      >
                        <input
                          type="text"
                          value={ing.name}
                          onChange={(e) => updateIngredientField(ing.id, "name", e.target.value)}
                          placeholder="Ingredient name"
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={ing.quantity}
                          onChange={(e) => updateIngredientField(ing.id, "quantity", e.target.value)}
                          placeholder="Qty"
                          className="w-11 sm:w-14 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white shrink-0"
                        />
                        <input
                          type="text"
                          value={ing.unit}
                          onChange={(e) => updateIngredientField(ing.id, "unit", e.target.value)}
                          placeholder="Unit"
                          className="w-12 sm:w-16 rounded-lg border border-slate-200 bg-white px-1 py-1 text-center text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => removeIngredientRow(ing.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer shrink-0"
                          title="Remove ingredient"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!isSuggesting && ingredientsList.length === 0 && !suggestionError && (
                  <div className="text-[11px] text-slate-400 italic py-1">
                    Type a dish name above to auto-suggest ingredients, or add them manually below.
                  </div>
                )}

                {/* Add Custom Ingredient Button */}
                <button
                  type="button"
                  onClick={handleAddEmptyIngredientRow}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-0.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add ingredient</span>
                </button>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMeal}
                disabled={!mealName.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
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
            className="w-[calc(100vw-24px)] max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Delete this meal?
            </h2>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              {deletingMeal.name}
            </p>

            <div className="flex items-center justify-end space-x-2 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setDeletingMeal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMeal}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-xs"
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
            className="w-[calc(100vw-24px)] max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#121214] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  Weekly Grocery List
                </h2>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Ingredients collected from all planned meals for this week
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowGroceryModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5 py-4 max-h-72 overflow-y-auto pr-1">
              {groceryChecklist.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No ingredients found for planned meals this week. You can add items below manually.
                </div>
              ) : (
                groceryChecklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-xs font-semibold dark:border-slate-800 dark:bg-[#1a1a1e] gap-2"
                  >
                    <div
                      onClick={() => handleToggleGroceryItem(item.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                    >
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition ${
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
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal block truncate">
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
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shrink-0"
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
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  placeholder="Add item..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                />
                <input
                  type="text"
                  value={customGroceryQty}
                  onChange={(e) => setCustomGroceryQty(e.target.value)}
                  placeholder="Qty"
                  className="w-16 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-center text-slate-900 outline-none dark:border-slate-800 dark:bg-[#1a1a1e] dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomGroceryItem}
                  disabled={!customGroceryName.trim()}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer shrink-0"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowGroceryModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePushSelectedToMindoGrocery}
                disabled={!groceryChecklist.some((i) => i.checked)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-xs"
              >
                Add Selected to Grocery
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
