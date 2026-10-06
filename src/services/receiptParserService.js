/**
 * src/services/receiptParserService.js
 * Normalized AI Receipt Extraction Abstraction.
 * Prepared for future OCR / Vision Model Integration (Gemini Vision / Supabase Edge / OpenAI Vision).
 */

export const CATEGORY_MAPPINGS = {
  carrefour: "Groceries",
  spinneys: "Groceries",
  lulu: "Groceries",
  choithrams: "Groceries",
  waitrose: "Groceries",
  unioncoop: "Groceries",
  zara: "Shopping",
  hm: "Shopping",
  amazon: "Shopping",
  noon: "Shopping",
  mcdonalds: "Food & Dining",
  kfc: "Food & Dining",
  starbucks: "Food & Dining",
  subway: "Food & Dining",
  babyshop: "Baby",
  mothercare: "Baby",
  enoc: "Transport",
  emarat: "Transport",
  adnoc: "Transport",
  uber: "Transport",
  careem: "Transport",
  dewa: "Bills",
  du: "Bills",
  etisalat: "Bills",
  aster: "Health",
  boots: "Health",
  life: "Health",
  netflix: "Entertainment",
  vox: "Entertainment",
};

/**
 * Parses a receipt image file.
 * Returns normalized receipt object ready for AI Review UI step before saving.
 */
export async function parseReceipt(file) {
  if (!file) {
    return {
      status: "error",
      message: "No receipt file provided",
      merchant: null,
      amount: null,
      currency: "AED",
      date: null,
      suggestedCategory: null,
      items: [],
      confidence: null,
    };
  }

  // Abstracted AI OCR Hook / Mock for architectural readiness
  return new Promise((resolve) => {
    setTimeout(() => {
      const filename = (file.name || "").toLowerCase();
      let merchant = null;
      let suggestedCategory = null;

      Object.keys(CATEGORY_MAPPINGS).forEach((key) => {
        if (filename.includes(key)) {
          merchant = key.charAt(0).toUpperCase() + key.slice(1);
          suggestedCategory = CATEGORY_MAPPINGS[key];
        }
      });

      resolve({
        status: "not_implemented", // Indicates ready for live Vision OCR connection
        merchant: merchant || null,
        amount: null,
        currency: "AED",
        date: new Date().toISOString().slice(0, 10),
        suggestedCategory: suggestedCategory || "Groceries",
        items: [],
        confidence: merchant ? 0.85 : null,
      });
    }, 350);
  });
}
