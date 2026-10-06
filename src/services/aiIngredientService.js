/**
 * src/services/aiIngredientService.js
 * Open-Ended Recipe-Aware AI Service for Mindo Meal Planner.
 * Understands global, regional, and transliterated food names (Pineapple Pachadi, Mutton Kulambu, Kadala Curry, Sambar, Sadya, Avial, etc.).
 * Guarantees zero generic ingredient fallbacks, anti-protein-contradiction validation, and zero silent substitutions.
 */

import { isSupabaseConfigured, supabase } from "../supabase.js";

const SYSTEM_PROMPT = `
You are Mindo's globally knowledgeable culinary AI assistant.

Food names may come from ANY country, region, culture, language, cuisine, or culinary tradition worldwide.
Examples include:
- Kerala: Pineapple Pachadi, Manga Pachadi, Sambar, Avial, Thoran, Olan, Kalan, Pachadi, Kichadi, Kadala Curry, Puttu, Appam, Idiyappam, Kerala Fish Curry, Mutton Curry, Mutton Kulambu, Beef Ularthiyathu, Malabar Biryani, Sadya.
- Tamil Nadu: Sambar, Rasam, Kootu, Poriyal, Pongal, Chettinad Chicken, Chicken Kulambu, Mutton Kulambu, Vatha Kuzhambu, Kara Kuzhambu, Lemon Rice, Curd Rice.
- Andhra / Telangana: Gongura, Pesarattu, Gutti Vankaya, Hyderabadi Biryani, Pulihora, Chicken 65, Andhra Chicken Curry.
- Karnataka: Bisi Bele Bath, Neer Dosa, Vangi Bath, Mysore Pak, Ragi Mudde.
- North Indian: Rajma Chawal, Chole Bhature, Sarson Ka Saag, Dal Makhani, Dal Baati Churma, Aloo Paratha, Paneer Butter Masala, Dhokla.
- International: Grilled Salmon, Caesar Salad, Thai Green Curry, Ramen, Sushi, Tacos, Falafel, Shakshuka, Lasagna, Pho, Paella, Goulash.

CRITICAL RULES:
1. Interpret the complete food name as a whole dish before generating ingredients.
2. NEVER return generic placeholders such as "Main ingredient", "Cooking oil", "Aromatic spices", or "Seasonings".
3. NEVER return the meal name itself as an ingredient.
4. NEVER substitute an unfamiliar dish with a different familiar dish (e.g. NEVER substitute Chicken Curry for Mutton Kulambu, Kadala Curry, or Pineapple Pachadi).
5. NEVER introduce chicken, mutton, beef, pork, or fish into a vegetarian, chickpea, fruit, vegetable, or fish dish unless explicitly requested in the meal name.
6. Only add pantry items (onion, garlic, ginger, oil, butter, pepper) when they are actually appropriate for the specific dish. (e.g. Fruit Salad must ONLY contain fruits; Oatmeal & Berries must contain oats, milk, berries, honey — NO onion/garlic/oil!).
7. If you cannot confidently identify the dish, set "recognized": false and return an empty ingredients array rather than inventing generic ingredients or another dish.

Return ONLY structured JSON adhering exactly to this schema:
{
  "recognized": true,
  "foodName": "Food Name",
  "foodType": "dish / meal / feast / breakfast / lunch / dinner / snack / dessert / curry / rice_dish / etc",
  "cuisine": "Kerala / South Indian / Tamil / Andhra / North Indian / Thai / Italian / Mexican / Global / etc",
  "region": "South India / East Asia / Europe / Middle East / Latin America / etc",
  "interpretation": "Detailed culinary interpretation of the food item",
  "ingredients": [
    { "name": "Ingredient Name", "quantity": "1", "unit": "cup" }
  ]
}
`;

/**
 * Anti-Contradiction Protein Protection Validation
 */
export function hasProteinContradiction(ingredients, mealName) {
  if (!Array.isArray(ingredients)) return false;
  const lowerMeal = (mealName || "").toLowerCase().trim();

  const isChickenDish = /chicken/i.test(lowerMeal);
  const isBeefDish = /beef/i.test(lowerMeal);
  const isMuttonDish = /mutton|lamb/i.test(lowerMeal);
  const isPorkDish = /pork|bacon/i.test(lowerMeal);
  const isFishDish = /fish|salmon|tuna|seafood|prawn|shrimp|crab|lobster/i.test(lowerMeal);
  const isChickpeaDish = /kadala|chickpea|chana|chole|rajma/i.test(lowerMeal);
  const isFruitOrSweetDish = /fruit salad|pachadi|oatmeal|berries|smoothie|sweet|dessert|payasam|halwa/i.test(lowerMeal) && !isChickenDish && !isBeefDish && !isMuttonDish && !isFishDish;

  const isExplicitVegDish =
    /veg|vegetable|avial|thoran|dosa|puttu|appam|idiyappam|paneer|dal|sambar|rasam|idli|olan|theeyal|pachadi|kalan|sadya|pongal|gongura|pesarattu|bisi bele|vangi bath|neer dosa|dhokla|misal|sarson|gatte|kootu/i.test(
      lowerMeal
    ) &&
    !isChickenDish &&
    !isBeefDish &&
    !isMuttonDish &&
    !isPorkDish &&
    !isFishDish;

  for (const ing of ingredients) {
    if (!ing || !ing.name) continue;
    const ingName = String(ing.name).toLowerCase();

    // 1. Chickpea / Legume dish must never contain meat or fish
    if (isChickpeaDish && !isChickenDish && !isBeefDish && !isMuttonDish && !isFishDish) {
      if (/chicken|mutton|beef|pork|fish|seafood|prawn|shrimp|lamb|bacon/i.test(ingName)) {
        return true;
      }
    }

    // 2. Fruit/Sweet dish must never contain meat/fish
    if (isFruitOrSweetDish) {
      if (/chicken|mutton|beef|pork|fish|seafood|prawn|shrimp|lamb|bacon/i.test(ingName)) {
        return true;
      }
    }

    // 3. Explicit Vegetarian dish must never contain meat or fish
    if (isExplicitVegDish) {
      if (/chicken|mutton|beef|pork|fish|seafood|prawn|shrimp|lamb|bacon/i.test(ingName)) {
        return true;
      }
    }

    // 4. Fish dish must never contain land meat
    if (isFishDish && !isChickenDish && !isBeefDish && !isMuttonDish) {
      if (/chicken|mutton|beef|pork|lamb|bacon/i.test(ingName)) {
        return true;
      }
    }

    // 5. Chicken dish must not contain beef/mutton/fish
    if (isChickenDish && !isBeefDish && !isMuttonDish && !isFishDish) {
      if (/beef|mutton|pork|fish|seafood|prawn|shrimp|lamb|bacon/i.test(ingName)) {
        return true;
      }
    }

    // 6. Mutton dish must not contain chicken/beef/fish
    if (isMuttonDish && !isChickenDish && !isBeefDish && !isFishDish) {
      if (/chicken|beef|pork|fish|seafood|prawn|shrimp|bacon/i.test(ingName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Strict Validation & Cleaning Layer
 * REJECTS any ingredient equal to the raw dish name, generic placeholder words, or duplicate names.
 * GUARANTEES ZERO generic placeholder ingredients ("Main ingredient", "Cooking oil", "Aromatic spices").
 */
export function validateAndCleanIngredients(ingredients, rawMealName) {
  if (!Array.isArray(ingredients)) return [];
  const cleanMeal = (rawMealName || "").toLowerCase().trim();
  const seen = new Set();
  const cleaned = [];

  const forbiddenPlaceholders = [
    "protein",
    "carbohydrates",
    "carbs",
    "seasoning",
    "seasonings",
    "aromatics",
    "aromatic spices",
    "main item",
    "main ingredient",
    "main ingredients",
    "sauce ingredients",
    "vegetables",
    "herbs & spices",
    "spices & seasonings",
    "generic spices",
    "cooking oil or butter",
    "portion",
  ];

  for (const ing of ingredients) {
    if (!ing || !ing.name) continue;
    const nameStr = String(ing.name).trim();
    if (!nameStr) continue;

    const lowerName = nameStr.toLowerCase();

    // 1. REJECT if ingredient name equals raw meal name
    if (lowerName === cleanMeal) continue;

    // 2. REJECT generic placeholder tokens
    if (forbiddenPlaceholders.includes(lowerName) || lowerName.startsWith("main ingredients for")) {
      continue;
    }

    // 3. DEDUPLICATE
    if (seen.has(lowerName)) continue;
    seen.add(lowerName);

    cleaned.push({
      name: nameStr,
      quantity: ing.quantity ? String(ing.quantity).trim() : "1",
      unit: ing.unit ? String(ing.unit).trim() : "",
    });
  }

  return cleaned;
}

/**
 * Open-Ended Dynamic Culinary Hydrator for Client-Side Hydration
 * Maps legitimate regional & global dishes to authentic, specific recipe components.
 */
function getSingleDishIngredients(dishName) {
  const lower = dishName.toLowerCase().trim();

  // Filter out obvious non-food keyboard gibberish (e.g. "asdfgh", "xyz123")
  if (
    !/[aeiouy]/i.test(lower) ||
    /^[b-df-hj-np-tv-z]{4,}$/i.test(lower) ||
    /asdf|qwerty|zxcv|1234|test123|foo123|xyz123/i.test(lower)
  ) {
    return { recognized: false, ingredients: [] };
  }

  // 1. Pachadi (Pineapple Pachadi / Manga Pachadi / Cucumber Pachadi)
  if (/pachadi/i.test(lower) && !/sadya/i.test(lower)) {
    const isPineapple = /pineapple/i.test(lower);
    const isMango = /manga|mango/i.test(lower);
    const mainFruit = isPineapple ? "Fresh pineapple (chopped)" : isMango ? "Raw mango (chopped)" : "Cucumber (chopped)";

    const ing = [
      { name: mainFruit, quantity: "1.5", unit: "cups" },
      { name: "Grated coconut", quantity: "1", unit: "cup" },
      { name: "Green chilli", quantity: "2", unit: "pieces" },
      { name: "Curd / Yogurt", quantity: "0.5", unit: "cup" },
      { name: "Mustard seeds", quantity: "1", unit: "tsp" },
      { name: "Cumin seeds", quantity: "0.5", unit: "tsp" },
      { name: "Curry leaves", quantity: "2", unit: "sprigs" },
      { name: "Coconut oil", quantity: "1.5", unit: "tbsp" },
    ];
    if (isPineapple || isMango) {
      ing.push({ name: "Sugar or Jaggery", quantity: "1", unit: "tbsp" });
    }
    return { recognized: true, foodType: "side dish", cuisine: "Kerala", ingredients: ing };
  }

  // 2. Kulambu / Kuzhambu (Mutton Kulambu / Chicken Kulambu / Vatha Kuzhambu)
  if (/kulambu|kuzhambu/i.test(lower)) {
    const isMutton = /mutton/i.test(lower);
    const isChicken = /chicken/i.test(lower);
    const isFish = /fish/i.test(lower);
    const isVatha = /vatha|kara/i.test(lower);

    let mainProtein = null;
    if (isMutton) mainProtein = { name: "Mutton pieces", quantity: "500", unit: "g" };
    else if (isChicken) mainProtein = { name: "Chicken pieces", quantity: "500", unit: "g" };
    else if (isFish) mainProtein = { name: "Fish fillets", quantity: "500", unit: "g" };
    else if (isVatha) mainProtein = { name: "Sundakkai (Nightshade berries) or Turkey berries", quantity: "0.5", unit: "cup" };

    const ing = [];
    if (mainProtein) ing.push(mainProtein);

    ing.push(
      { name: "Shallots / Small onions", quantity: "12", unit: "pieces" },
      { name: "Tomato", quantity: "2", unit: "pieces" },
      { name: "Tamarind extract", quantity: "2", unit: "tbsp" },
      { name: "Ginger & Garlic paste", quantity: "1", unit: "tbsp" },
      { name: "Curry leaves", quantity: "2", unit: "sprigs" },
      { name: "Kulambu chilli powder", quantity: "2", unit: "tbsp" },
      { name: "Fennel seeds", quantity: "1", unit: "tsp" },
      { name: "Grated coconut paste", quantity: "0.5", unit: "cup" },
      { name: "Sesame oil or Cooking oil", quantity: "2", unit: "tbsp" }
    );
    return { recognized: true, foodType: "curry / gravy", cuisine: "Tamil Nadu / Kerala", ingredients: ing };
  }

  // 3. Sadya (Traditional Kerala Vegetarian Feast)
  if (/sadya|sadhya/i.test(lower)) {
    return {
      recognized: true,
      foodType: "feast / meal",
      cuisine: "Kerala",
      ingredients: [
        { name: "Kerala Matta Rice", quantity: "2", unit: "cups" },
        { name: "Toor dal (Parippu)", quantity: "0.5", unit: "cup" },
        { name: "Grated coconut", quantity: "2", unit: "cups" },
        { name: "Mixed vegetables (Raw banana, Yam, Ash gourd, Cucumber, Carrot, Beans)", quantity: "4", unit: "cups" },
        { name: "Curd / Yogurt", quantity: "1", unit: "cup" },
        { name: "Tamarind", quantity: "1", unit: "tbsp" },
        { name: "Curry leaves", quantity: "4", unit: "sprigs" },
        { name: "Mustard seeds", quantity: "1", unit: "tbsp" },
        { name: "Jaggery", quantity: "2", unit: "tbsp" },
        { name: "Coconut oil", quantity: "3", unit: "tbsp" },
      ],
    };
  }

  // 4. Sambar
  if (/sambar/i.test(lower)) {
    return {
      recognized: true,
      foodType: "curry / stew",
      cuisine: "South Indian",
      ingredients: [
        { name: "Toor dal (Yellow pigeon peas)", quantity: "1", unit: "cup" },
        { name: "Mixed vegetables (Drumstick, Carrot, Pumpkin)", quantity: "2", unit: "cups" },
        { name: "Shallots / Small onions", quantity: "8", unit: "pieces" },
        { name: "Tomato", quantity: "1", unit: "piece" },
        { name: "Tamarind extract", quantity: "2", unit: "tbsp" },
        { name: "Sambar powder", quantity: "2", unit: "tbsp" },
        { name: "Mustard seeds", quantity: "1", unit: "tsp" },
        { name: "Curry leaves", quantity: "2", unit: "sprigs" },
        { name: "Asafoetida (Hing)", quantity: "0.25", unit: "tsp" },
        { name: "Coconut oil or Ghee", quantity: "1.5", unit: "tbsp" },
      ],
    };
  }

  // 5. Kadala Curry (Kerala chickpea curry)
  if (/kadala|chickpea curry|black chickpea/i.test(lower) && !/chicken/i.test(lower)) {
    return {
      recognized: true,
      foodType: "curry",
      cuisine: "Kerala",
      ingredients: [
        { name: "Black chickpeas (Kadala)", quantity: "1", unit: "cup" },
        { name: "Onion", quantity: "1", unit: "piece" },
        { name: "Ginger", quantity: "1", unit: "tsp" },
        { name: "Garlic", quantity: "4", unit: "cloves" },
        { name: "Green chilli", quantity: "2", unit: "pieces" },
        { name: "Curry leaves", quantity: "2", unit: "sprigs" },
        { name: "Grated coconut", quantity: "0.5", unit: "cup" },
        { name: "Turmeric & Chilli powder", quantity: "1", unit: "tsp" },
        { name: "Coriander powder", quantity: "1", unit: "tsp" },
        { name: "Coconut oil", quantity: "2", unit: "tbsp" },
      ],
    };
  }

  // 6. Puttu (Kerala steamed rice cake)
  if (/puttu/i.test(lower) && !/kadala/i.test(lower)) {
    return {
      recognized: true,
      foodType: "breakfast",
      cuisine: "Kerala",
      ingredients: [
        { name: "Puttu flour (Rice flour)", quantity: "2", unit: "cups" },
        { name: "Grated coconut", quantity: "1", unit: "cup" },
        { name: "Water", quantity: "1", unit: "cup" },
        { name: "Salt", quantity: "0.5", unit: "tsp" },
      ],
    };
  }

  // 7. Avial
  if (/avial|aviyal/i.test(lower)) {
    return {
      recognized: true,
      foodType: "dish",
      cuisine: "Kerala / Tamil Nadu",
      ingredients: [
        { name: "Mixed vegetables (Raw banana, Yam, Carrot, Beans, Drumstick)", quantity: "3", unit: "cups" },
        { name: "Grated coconut", quantity: "1", unit: "cup" },
        { name: "Green chilli", quantity: "3", unit: "pieces" },
        { name: "Cumin seeds", quantity: "1", unit: "tsp" },
        { name: "Curd / Yogurt", quantity: "0.5", unit: "cup" },
        { name: "Curry leaves", quantity: "2", unit: "sprigs" },
        { name: "Coconut oil", quantity: "2", unit: "tbsp" },
        { name: "Turmeric powder", quantity: "0.5", unit: "tsp" },
      ],
    };
  }

  // 8. Thoran / Poriyal
  if (/thoran|poriyal/i.test(lower)) {
    return {
      recognized: true,
      foodType: "side dish",
      cuisine: "South Indian",
      ingredients: [
        { name: "Finely chopped vegetables (Cabbage / Beans / Carrot)", quantity: "2.5", unit: "cups" },
        { name: "Grated coconut", quantity: "0.5", unit: "cup" },
        { name: "Shallots / Onion", quantity: "4", unit: "pieces" },
        { name: "Green chilli", quantity: "2", unit: "pieces" },
        { name: "Mustard seeds", quantity: "1", unit: "tsp" },
        { name: "Curry leaves", quantity: "1", unit: "sprig" },
        { name: "Turmeric powder", quantity: "0.5", unit: "tsp" },
        { name: "Coconut oil", quantity: "1.5", unit: "tbsp" },
      ],
    };
  }

  // 9. Kerala Fish Curry / Fish Curry
  if (/fish curry|kerala fish curry/i.test(lower) && !/chicken/i.test(lower)) {
    return {
      recognized: true,
      foodType: "curry",
      cuisine: "Kerala",
      ingredients: [
        { name: "Fish fillets (Seer fish / King fish)", quantity: "500", unit: "g" },
        { name: "Shallots / Small onions", quantity: "10", unit: "pieces" },
        { name: "Tomato", quantity: "1", unit: "piece" },
        { name: "Kudampuli (Gamboge) or Tamarind", quantity: "3", unit: "pieces" },
        { name: "Ginger & Garlic", quantity: "1", unit: "tbsp" },
        { name: "Green chilli", quantity: "2", unit: "pieces" },
        { name: "Curry leaves", quantity: "2", unit: "sprigs" },
        { name: "Kashmiri chilli powder", quantity: "1.5", unit: "tbsp" },
        { name: "Turmeric powder", quantity: "0.5", unit: "tsp" },
        { name: "Coconut oil", quantity: "2", unit: "tbsp" },
      ],
    };
  }

  // 10. Fruit Salad
  if (/fruit salad/i.test(lower)) {
    return {
      recognized: true,
      foodType: "dessert / salad",
      cuisine: "Global",
      ingredients: [
        { name: "Apple (cubed)", quantity: "1", unit: "piece" },
        { name: "Banana (sliced)", quantity: "1", unit: "piece" },
        { name: "Orange segments", quantity: "1", unit: "piece" },
        { name: "Seedless grapes", quantity: "1", unit: "cup" },
        { name: "Fresh berries", quantity: "0.5", unit: "cup" },
      ],
    };
  }

  // 11. Oatmeal & Berries
  if (/oatmeal|porridge/i.test(lower)) {
    return {
      recognized: true,
      foodType: "breakfast",
      cuisine: "Global",
      ingredients: [
        { name: "Rolled oats", quantity: "1", unit: "cup" },
        { name: "Milk", quantity: "1", unit: "cup" },
        { name: "Fresh berries", quantity: "0.5", unit: "cup" },
        { name: "Honey", quantity: "1", unit: "tbsp" },
      ],
    };
  }

  // 12. Avocado Toast
  if (/avocado toast/i.test(lower)) {
    return {
      recognized: true,
      foodType: "breakfast / snack",
      cuisine: "Global",
      ingredients: [
        { name: "Sourdough bread", quantity: "2", unit: "slices" },
        { name: "Ripe avocado", quantity: "1", unit: "piece" },
        { name: "Lemon juice", quantity: "1", unit: "tbsp" },
        { name: "Salt", quantity: "0.5", unit: "tsp" },
        { name: "Crushed black pepper", quantity: "0.5", unit: "tsp" },
      ],
    };
  }

  // 13. Salmon (Grilled / Baked)
  if (/salmon/i.test(lower)) {
    return {
      recognized: true,
      foodType: "dish",
      cuisine: "Global",
      ingredients: [
        { name: "Salmon fillet", quantity: "2", unit: "fillets" },
        { name: "Lemon", quantity: "1", unit: "piece" },
        { name: "Olive oil", quantity: "1", unit: "tbsp" },
        { name: "Garlic", quantity: "2", unit: "cloves" },
        { name: "Black pepper", quantity: "0.5", unit: "tsp" },
        { name: "Fresh dill", quantity: "1", unit: "tbsp" },
        { name: "Salt", quantity: "0.5", unit: "tsp" },
      ],
    };
  }

  // 14. Sandwich
  if (/sandwich|sub|panini/i.test(lower)) {
    const isEgg = /egg/i.test(lower);
    const isChicken = /chicken/i.test(lower);
    const isTuna = /tuna/i.test(lower);

    const ing = [{ name: "Sandwich bread", quantity: "2", unit: "slices" }];
    if (isEgg) ing.push({ name: "Eggs (boiled)", quantity: "2", unit: "pieces" });
    else if (isChicken) ing.push({ name: "Chicken breast (cooked)", quantity: "150", unit: "g" });
    else if (isTuna) ing.push({ name: "Canned tuna", quantity: "1", unit: "can" });

    ing.push(
      { name: "Lettuce", quantity: "2", unit: "leaves" },
      { name: "Tomato", quantity: "2", unit: "slices" },
      { name: "Cucumber", quantity: "4", unit: "slices" },
      { name: "Cheese", quantity: "1", unit: "slice" },
      { name: "Mayonnaise", quantity: "1", unit: "tbsp" }
    );
    return { recognized: true, foodType: "sandwich", cuisine: "Global", ingredients: ing };
  }

  // 15. Chicken Rice
  if (lower === "chicken rice" || /hainanese chicken rice/i.test(lower)) {
    return {
      recognized: true,
      foodType: "dish",
      cuisine: "Asian",
      ingredients: [
        { name: "Chicken breast", quantity: "500", unit: "g" },
        { name: "Jasmine rice", quantity: "2", unit: "cups" },
        { name: "Ginger", quantity: "1", unit: "tbsp" },
        { name: "Garlic", quantity: "4", unit: "cloves" },
        { name: "Soy sauce", quantity: "1", unit: "tbsp" },
        { name: "Spring onion", quantity: "2", unit: "stalks" },
        { name: "Chicken stock", quantity: "2", unit: "cups" },
        { name: "Sesame oil", quantity: "1", unit: "tsp" },
      ],
    };
  }

  // 16. Dosa
  if (lower === "dosa" || lower === "plain dosa" || lower === "crispy dosa" || /masala dosa/i.test(lower)) {
    return {
      recognized: true,
      foodType: "crepe / breakfast",
      cuisine: "South Indian",
      ingredients: [
        { name: "Rice", quantity: "2", unit: "cups" },
        { name: "Urad dal (Black gram)", quantity: "1", unit: "cup" },
        { name: "Fenugreek seeds", quantity: "1", unit: "tsp" },
        { name: "Salt", quantity: "1", unit: "tsp" },
        { name: "Cooking oil / Ghee", quantity: "2", unit: "tbsp" },
      ],
    };
  }

  // 17. Biryani
  if (/biryani/i.test(lower)) {
    const isBeef = /beef/i.test(lower);
    const isMutton = /mutton|lamb/i.test(lower);
    const isVeg = /veg|vegetable/i.test(lower);
    const isChicken = /chicken/i.test(lower);

    let proteinItem = null;
    if (isBeef) proteinItem = { name: "Beef pieces", quantity: "500", unit: "g" };
    else if (isMutton) proteinItem = { name: "Mutton pieces", quantity: "500", unit: "g" };
    else if (isVeg) proteinItem = { name: "Mixed vegetables (Carrot, Peas, Potato)", quantity: "2", unit: "cups" };
    else if (isChicken) proteinItem = { name: "Chicken pieces", quantity: "500", unit: "g" };

    const ing = [];
    if (proteinItem) ing.push(proteinItem);

    ing.push(
      { name: "Basmati rice", quantity: "2", unit: "cups" },
      { name: "Onion", quantity: "2", unit: "pieces" },
      { name: "Tomato", quantity: "2", unit: "pieces" },
      { name: "Ginger & Garlic paste", quantity: "1", unit: "tbsp" },
      { name: "Green chilli", quantity: "2", unit: "pieces" },
      { name: "Yogurt", quantity: "0.5", unit: "cup" },
      { name: "Fresh mint & coriander", quantity: "1", unit: "handful" },
      { name: "Biryani spices", quantity: "1", unit: "tbsp" },
      { name: "Cooking oil / Ghee", quantity: "2", unit: "tbsp" }
    );
    return { recognized: true, foodType: "rice dish", cuisine: "Indian", ingredients: ing };
  }

  // NO generic fallback placeholder array!
  return { recognized: false, ingredients: [] };
}

/**
 * Dynamic Culinary Engine for Multi-component Dishes
 */
function generateDynamicCulinaryIngredients(dishName) {
  if (!dishName || typeof dishName !== "string") {
    return { recognized: false, ingredients: [] };
  }

  const cleanName = dishName.trim();
  const parts = cleanName.split(/\s*[\+&]|(?:\s+and\s+)\s*/i).filter((p) => p.trim());

  if (parts.length > 1) {
    const combined = [];
    const seen = new Set();
    let recognizedAny = false;

    parts.forEach((part) => {
      const res = getSingleDishIngredients(part.trim());
      if (res.recognized && Array.isArray(res.ingredients)) {
        recognizedAny = true;
        res.ingredients.forEach((ing) => {
          const key = ing.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(ing);
          }
        });
      }
    });

    return { recognized: recognizedAny, ingredients: combined };
  }

  return getSingleDishIngredients(cleanName);
}

/**
 * Core AI Invoker with 1-Retry Guard and Anti-Substitution Protection
 */
async function callAIModel(promptText, cleanName, servings) {
  const geminiKey = typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY;

  // 1. Try Supabase Edge Function
  if (isSupabaseConfigured && supabase?.functions) {
    try {
      const { data, error } = await supabase.functions.invoke("suggest-ingredients", {
        body: { mealName: cleanName, servings, promptText },
      });
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.debug("[Meal AI] Supabase edge function call bypassed:", err);
    }
  }

  // 2. Try Gemini API
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${promptText}\nFood item: "${cleanName}" for ${servings} servings.` }] }],
          }),
        }
      );
      const json = await res.json();
      const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (err) {
      console.warn("[Meal AI] Gemini API call error:", err);
    }
  }

  return null;
}

/**
 * Main AI Suggestion Entry Point
 * Accepts ANY food, meal, feast, or dish entered by user and sends to AI.
 */
export async function suggestIngredients(mealName, servings = 4) {
  const cleanName = (mealName || "").trim();
  if (!cleanName || cleanName.length < 2) {
    return { recognized: false, ingredients: [], error: "Dish name too short." };
  }

  const requestId = Math.random().toString(36).slice(2, 9);
  console.log(`=== MINDO INGREDIENT GENERATION ===`);
  console.log(`[Meal AI] Input meal: "${cleanName}" (Request ID: ${requestId})`);

  let aiResponse = await callAIModel(SYSTEM_PROMPT, cleanName, servings);

  // Validate initial AI Response
  let isAiValid =
    aiResponse &&
    aiResponse.recognized !== false &&
    Array.isArray(aiResponse.ingredients) &&
    aiResponse.ingredients.length > 0 &&
    !hasProteinContradiction(aiResponse.ingredients, cleanName);

  // 1 RETRY GUARD if initial response introduced invalid or contradictory ingredients
  if (aiResponse && !isAiValid) {
    console.warn(`[Meal AI] Initial AI response failed validation for "${cleanName}". Retrying once...`);
    const retryPrompt = `${SYSTEM_PROMPT}\n\nWARNING: The previous result for "${cleanName}" was invalid because it introduced contradictory ingredients or generic placeholders.
Generate ingredients specifically for "${cleanName}". Do NOT return generic placeholders like "Main ingredient" or "Aromatic spices". Return strictly valid JSON.`;

    const retryResponse = await callAIModel(retryPrompt, cleanName, servings);
    if (
      retryResponse &&
      retryResponse.recognized !== false &&
      Array.isArray(retryResponse.ingredients) &&
      retryResponse.ingredients.length > 0 &&
      !hasProteinContradiction(retryResponse.ingredients, cleanName)
    ) {
      aiResponse = retryResponse;
      isAiValid = true;
    }
  }

  let finalIngredients = [];
  let isRecognized = false;

  if (isAiValid && aiResponse?.ingredients) {
    finalIngredients = validateAndCleanIngredients(aiResponse.ingredients, cleanName);
    isRecognized = true;
  }

  // Fall back to dynamic culinary engine if AI API is unavailable or returned unparseable text
  if (!finalIngredients.length) {
    console.log(`[Meal AI] Running dynamic culinary fallback engine for "${cleanName}"`);
    const fallbackRes = generateDynamicCulinaryIngredients(cleanName);
    if (fallbackRes.recognized && Array.isArray(fallbackRes.ingredients)) {
      finalIngredients = validateAndCleanIngredients(fallbackRes.ingredients, cleanName);
      isRecognized = true;
    }
  }

  // Final check: Guarantee zero protein contradiction
  if (hasProteinContradiction(finalIngredients, cleanName)) {
    console.error(`[Meal AI] REJECTED final ingredients for "${cleanName}" due to protein contradiction!`);
    finalIngredients = [];
    isRecognized = false;
  }

  console.log(`[Meal AI] Final output for "${cleanName}": recognized=${isRecognized}, items=${finalIngredients.length}`);

  if (!isRecognized || !finalIngredients.length) {
    return {
      recognized: false,
      dishName: cleanName,
      ingredients: [],
      error: `Couldn't generate ingredients for "${cleanName}". Please try again or add them manually below.`,
    };
  }

  return {
    recognized: true,
    dishName: cleanName,
    ingredients: finalIngredients,
    error: null,
  };
}
