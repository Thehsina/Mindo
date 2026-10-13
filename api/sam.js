import { processSamMessage } from "../server/samBackend.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "Only POST requests are allowed." });
  }

  try {
    const { message, chatHistory, context } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "INVALID_REQUEST", message: "Message string is required." });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    const result = await processSamMessage({
      message,
      chatHistory,
      context,
      apiKey,
    });

    if (result.error) {
      return res.status(result.error === "MISSING_API_KEY" ? 503 : 500).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error("[Vercel Function Error] /api/sam:", err);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Sorry, I couldn't process that right now. Please try again.",
    });
  }
}
