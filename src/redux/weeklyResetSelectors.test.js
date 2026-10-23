// src/redux/weeklyResetSelectors.test.js
import {
  selectTotalTasksCompletedCount,
  selectHighestHabitStreak,
  selectTopHabitDetails,
  selectWeeklyGrocerySpend,
  selectSundayResetSummary,
  getLast7DateStrings,
} from "./weeklyResetSelectors.js";
import { formatLocalDate } from "../utils/dateUtils.js";

function runTests() {
  console.log("=== RUNNING SUNDAY RESET SELECTORS TEST SUITE ===");
  let passed = 0;
  let failed = 0;

  const today = new Date();
  const todayStr = formatLocalDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  const tenDaysAgo = new Date(today);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const tenDaysAgoStr = formatLocalDate(tenDaysAgo);

  // 1. Tasks Completion Test
  const mockState = {
    tasks: [
      { id: "t1", title: "Write report", completed: true, completedAt: todayStr },
      { id: "t2", title: "Team sync", completed: true, dueDate: yesterdayStr },
      { id: "t3", title: "Old task", completed: true, completedAt: tenDaysAgoStr },
      { id: "t4", title: "Pending task", completed: false, dueDate: todayStr },
      { id: "t5", title: "Untracked date completed", completed: true },
    ],
    habits: {
      habits: [
        { id: "h1", name: "Morning Run", icon: "🏃", frequency: "daily", paused: false },
        { id: "h2", name: "Read Books", icon: "📖", frequency: "daily", paused: false },
      ],
      completions: [
        // h1 has 2-day streak (today and yesterday)
        { habitId: "h1", date: todayStr, completed: true },
        { habitId: "h1", date: yesterdayStr, completed: true },
        // h2 has 1-day streak
        { habitId: "h2", date: todayStr, completed: true },
      ],
    },
    expenses: [
      { id: "e1", category: "Groceries", amount: 45.5, type: "expense", date: todayStr, currency: "AED" },
      { id: "e2", category: "Groceries", amount: 30.0, type: "expense", date: yesterdayStr, currency: "AED" },
      { id: "e3", category: "Groceries", amount: 100.0, type: "expense", date: tenDaysAgoStr, currency: "AED" }, // Outside 7 days
      { id: "e4", category: "Transport", amount: 20.0, type: "expense", date: todayStr, currency: "AED" }, // Not groceries
      { id: "e5", category: "Groceries", amount: 50.0, type: "income", date: todayStr, currency: "AED" }, // Income, ignore
    ],
  };

  // Test 1: Tasks
  const completedCount = selectTotalTasksCompletedCount(mockState);
  if (completedCount === 3) {
    console.log(`✓ Passed: Completed tasks last 7 days count is ${completedCount} (t1, t2, t5)`);
    passed++;
  } else {
    console.error(`❌ Failed: Expected 3 completed tasks, got ${completedCount}`);
    failed++;
  }

  // Test 2: Habits streak
  const streak = selectHighestHabitStreak(mockState);
  const topHabit = selectTopHabitDetails(mockState);
  if (streak === 2 && topHabit.habitName === "Morning Run") {
    console.log(`✓ Passed: Top habit streak is ${streak} days (${topHabit.habitName})`);
    passed++;
  } else {
    console.error(`❌ Failed: Expected streak 2 for 'Morning Run', got ${streak} (${topHabit.habitName})`);
    failed++;
  }

  // Test 3: Groceries Spend
  const grocerySpend = selectWeeklyGrocerySpend(mockState);
  if (grocerySpend === 75.5) {
    console.log(`✓ Passed: Grocery spend is 75.5 AED (45.5 + 30.0)`);
    passed++;
  } else {
    console.error(`❌ Failed: Expected 75.5 AED, got ${grocerySpend}`);
    failed++;
  }

  // Test 4: Combined Summary
  const summary = selectSundayResetSummary(mockState);
  if (
    summary.tasksCompleted === 3 &&
    summary.highestStreak === 2 &&
    summary.grocerySpend === 75.5 &&
    summary.currency === "AED"
  ) {
    console.log(`✓ Passed: Full summary selector matches all metrics`);
    passed++;
  } else {
    console.error(`❌ Failed: Summary object mismatch:`, summary);
    failed++;
  }

  // Test 5: Empty State Safety
  const emptySummary = selectSundayResetSummary({});
  if (
    emptySummary.tasksCompleted === 0 &&
    emptySummary.highestStreak === 0 &&
    emptySummary.grocerySpend === 0
  ) {
    console.log(`✓ Passed: Empty state handled safely without errors`);
    passed++;
  } else {
    console.error(`❌ Failed: Empty state mismatch:`, emptySummary);
    failed++;
  }

  console.log(`\n=== SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests();
