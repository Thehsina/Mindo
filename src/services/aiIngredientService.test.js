/**
 * src/services/aiIngredientService.test.js
 * Comprehensive Regression & Anti-Generic Ingredient Test Suite for Mindo Meal Planner.
 */

import { suggestIngredients, validateAndCleanIngredients } from "./aiIngredientService.js";

async function runTests() {
  console.log("=== RUNNING REGRESSION & ANTI-GENERIC INGREDIENT SUITE ===");

  const testCases = [
    {
      dish: "Pineapple Pachadi",
      expectRecognized: true,
      forbiddenNames: ["Main ingredient", "Cooking oil", "Aromatic spices", "Chicken", "Egg"],
      requiredNames: ["Pineapple", "Grated coconut", "Curd / Yogurt"],
    },
    {
      dish: "Mutton Kulambu",
      expectRecognized: true,
      forbiddenNames: ["Chicken", "Main ingredient", "Aromatic spices"],
      requiredNames: ["Mutton pieces", "Shallots / Small onions", "Tamarind extract"],
    },
    {
      dish: "Kadala Curry",
      expectRecognized: true,
      forbiddenNames: ["Chicken", "Mutton", "Beef"],
      requiredNames: ["Black chickpeas (Kadala)", "Curry leaves", "Coconut oil"],
    },
    {
      dish: "Grilled Salmon",
      expectRecognized: true,
      forbiddenNames: ["Grilled Salmon", "Main ingredient"],
      requiredNames: ["Salmon fillet", "Lemon", "Olive oil"],
    },
    {
      dish: "Sandwich",
      expectRecognized: true,
      forbiddenNames: ["Egg", "Chicken", "Tuna"],
      requiredNames: ["Sandwich bread", "Lettuce", "Tomato"],
    },
    {
      dish: "Chicken Rice",
      expectRecognized: true,
      forbiddenNames: ["Main ingredient"],
      requiredNames: ["Chicken breast", "Jasmine rice", "Ginger"],
    },
    {
      dish: "Dosa",
      expectRecognized: true,
      forbiddenNames: ["Biryani spices", "Chicken", "Yogurt"],
      requiredNames: ["Rice", "Urad dal (Black gram)", "Fenugreek seeds"],
    },
    {
      dish: "Biryani",
      expectRecognized: true,
      forbiddenNames: ["Chicken pieces", "Beef pieces", "Mutton pieces"],
      requiredNames: ["Basmati rice", "Onion", "Biryani spices"],
    },
    {
      dish: "Vegetable Biryani",
      expectRecognized: true,
      forbiddenNames: ["Chicken", "Beef", "Mutton", "Pork"],
      requiredNames: ["Mixed vegetables (Carrot, Peas, Potato)", "Basmati rice"],
    },
    {
      dish: "Fruit Salad",
      expectRecognized: true,
      forbiddenNames: ["Onion", "Garlic", "Cooking oil", "Aromatic spices", "Curry leaves"],
      requiredNames: ["Apple (cubed)", "Banana (sliced)", "Fresh berries"],
    },
    {
      dish: "Oatmeal & Berries",
      expectRecognized: true,
      forbiddenNames: ["Onion", "Garlic", "Cooking oil", "Spices"],
      requiredNames: ["Rolled oats", "Milk", "Fresh berries", "Honey"],
    },
    {
      dish: "Avocado Toast",
      expectRecognized: true,
      forbiddenNames: ["Onion", "Garlic", "Cooking oil"],
      requiredNames: ["Sourdough bread", "Ripe avocado", "Lemon juice"],
    },
    {
      dish: "asdfgh",
      expectRecognized: false,
      forbiddenNames: [],
      requiredNames: [],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`\n--- Testing Case: "${tc.dish}" ---`);
    const res = await suggestIngredients(tc.dish);

    console.log(`Recognized: ${res.recognized}`);
    console.log(`Ingredients (${res.ingredients.length}):`, res.ingredients);

    if (res.recognized !== tc.expectRecognized) {
      console.error(`❌ FAILED: "${tc.dish}" expected recognized=${tc.expectRecognized}, got ${res.recognized}`);
      failed++;
      continue;
    }

    if (!tc.expectRecognized) {
      if (res.ingredients.length === 0) {
        console.log(`✓ PASSED: Unrecognized input returned 0 ingredients cleanly.`);
        passed++;
      } else {
        console.error(`❌ FAILED: Unrecognized input returned non-empty ingredients!`);
        failed++;
      }
      continue;
    }

    // Check forbidden names
    let hasForbidden = false;
    for (const forbidden of tc.forbiddenNames) {
      const match = res.ingredients.some((ing) => ing.name.toLowerCase().includes(forbidden.toLowerCase()));
      if (match) {
        console.error(`❌ FAILED: "${tc.dish}" contained forbidden item "${forbidden}"!`);
        hasForbidden = true;
        break;
      }
    }
    if (hasForbidden) {
      failed++;
      continue;
    }

    // Check required names
    let missingRequired = false;
    for (const req of tc.requiredNames) {
      const match = res.ingredients.some((ing) => ing.name.toLowerCase().includes(req.toLowerCase()));
      if (!match) {
        console.error(`❌ FAILED: "${tc.dish}" missing required item "${req}"!`);
        missingRequired = true;
        break;
      }
    }
    if (missingRequired) {
      failed++;
      continue;
    }

    console.log(`✓ PASSED: "${tc.dish}" generated authentic specific ingredients.`);
    passed++;
  }

  console.log(`\n=== SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
}

runTests();

export { runTests };
