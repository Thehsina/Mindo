/**
 * src/utils/groceryHelpers.js
 * Utility helper to extract, normalize, consolidate, and format ingredients
 * from planned meals for the Weekly Grocery List modal in Mindo.
 */

function parseNumber(val) {
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (!val || typeof val !== "string") return null;
  const str = val.trim();
  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

export function parseIngredient(rawIng) {
  if (!rawIng) return null;

  // Case 1: Ingredient is an Object
  if (typeof rawIng === "object") {
    const name = (rawIng.name || rawIng.ingredient || rawIng.title || rawIng.item || "").trim();
    if (!name) return null;

    const qtyNum = parseNumber(rawIng.quantity);
    const unitStr = (rawIng.unit || "").trim();

    return {
      name,
      quantity: qtyNum,
      unit: unitStr,
      rawQtyStr: rawIng.displayQty || rawIng.quantityStr || (qtyNum !== null ? `${qtyNum}${unitStr ? ` ${unitStr}` : ""}` : ""),
    };
  }

  // Case 2: Ingredient is a String
  if (typeof rawIng === "string") {
    const str = rawIng.trim();
    if (!str) return null;

    // Check for dash separator: "Milk — 1 cup", "Milk - 250g", "Chicken breast - 250 g"
    const dashMatch = str.match(/^(.+?)\s*[—\-–]\s*(.+)$/);
    if (dashMatch) {
      const namePart = dashMatch[1].trim();
      const qtyPart = dashMatch[2].trim();
      const matchQty = qtyPart.match(/^([\d\/\.]+)\s*(.*)$/);
      if (matchQty) {
        return {
          name: namePart,
          quantity: parseNumber(matchQty[1]),
          unit: matchQty[2].trim(),
          rawQtyStr: qtyPart,
        };
      }
      return {
        name: namePart,
        quantity: null,
        unit: "",
        rawQtyStr: qtyPart,
      };
    }

    // Check for leading quantity: "1 cup Milk", "2.5 cups berries", "250g Chicken breast"
    const leadingMatch = str.match(/^([\d\/\.]+)\s*([a-zA-Z]*)\s+(.+)$/);
    if (leadingMatch) {
      const qNum = parseNumber(leadingMatch[1]);
      const uStr = leadingMatch[2].trim();
      const nStr = leadingMatch[3].trim();
      if (qNum !== null && nStr) {
        return {
          name: nStr,
          quantity: qNum,
          unit: uStr,
          rawQtyStr: `${leadingMatch[1]} ${uStr}`.trim(),
        };
      }
    }

    // Default: simple string name
    return {
      name: str,
      quantity: null,
      unit: "",
      rawQtyStr: "",
    };
  }

  return null;
}

export function generateWeeklyGroceryItems(plannedMeals = []) {
  if (!Array.isArray(plannedMeals) || !plannedMeals.length) {
    return [];
  }

  const map = new Map();

  plannedMeals.forEach((meal) => {
    if (!meal) return;
    const dishTitle = (meal.name || meal.title || "").trim();

    const rawIngredients = Array.isArray(meal.ingredients) ? meal.ingredients : [];

    rawIngredients.forEach((rawIng) => {
      const parsed = parseIngredient(rawIng);
      if (!parsed || !parsed.name) return; // Skip invalid / blank ingredients

      // Normalize key for deduplication
      const key = parsed.name.toLowerCase().trim();

      if (map.has(key)) {
        const existing = map.get(key);

        // Add source dish if not already included
        if (dishTitle && !existing.sources.includes(dishTitle)) {
          existing.sources.push(dishTitle);
        }

        existing.count += 1;

        // Quantity Consolidation
        if (typeof parsed.quantity === "number" && !isNaN(parsed.quantity)) {
          if (typeof existing.numericQty === "number" && !isNaN(existing.numericQty)) {
            // Check unit compatibility
            if (!existing.unit || !parsed.unit || existing.unit.toLowerCase() === parsed.unit.toLowerCase()) {
              existing.numericQty += parsed.quantity;
              if (!existing.unit && parsed.unit) {
                existing.unit = parsed.unit;
              }
            } else {
              // Incompatible units -> combine string representation safely
              existing.rawQtyStrs.push(parsed.rawQtyStr || `${parsed.quantity} ${parsed.unit}`.trim());
            }
          } else {
            existing.numericQty = parsed.quantity;
            existing.unit = parsed.unit || existing.unit || "";
          }
        } else if (parsed.rawQtyStr) {
          existing.rawQtyStrs.push(parsed.rawQtyStr);
        }
      } else {
        // New ingredient entry
        const sources = dishTitle ? [dishTitle] : [];
        const rawQtyStrs = parsed.rawQtyStr ? [parsed.rawQtyStr] : [];

        map.set(key, {
          id: `ing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: parsed.name,
          numericQty: typeof parsed.quantity === "number" ? parsed.quantity : null,
          unit: parsed.unit || "",
          rawQtyStrs,
          sources,
          count: 1,
          checked: true,
        });
      }
    });
  });

  // Convert map to final items with formatted displayQty
  return Array.from(map.values()).map((item) => {
    let displayQty = "1";

    if (typeof item.numericQty === "number" && !isNaN(item.numericQty)) {
      const numStr = Number.isInteger(item.numericQty)
        ? String(item.numericQty)
        : String(Number(item.numericQty.toFixed(2)));
      displayQty = item.unit ? `${numStr} ${item.unit}`.trim() : numStr;
    } else if (item.rawQtyStrs.length > 0) {
      displayQty = item.rawQtyStrs.join(" + ");
    } else if (item.count > 1) {
      displayQty = `${item.count} portions`;
    }

    return {
      id: item.id,
      name: item.name,
      displayQty,
      sources: item.sources,
      count: item.count,
      checked: item.checked,
    };
  });
}
