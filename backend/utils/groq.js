import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

let groq = null;
const getClient = () => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set in backend/.env — get a free key at https://console.groq.com/keys");
  }
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
};

/**
 * Suggests a priority (low/medium/high/urgent) + a one-line reason
 * for a given card title/description.
 */
export const suggestPriority = async (title, description = "") => {
  const prompt = `You are a project management assistant. Given a task title and description, classify its priority.
Respond ONLY with strict JSON, no markdown, no preamble, in this exact shape:
{"priority": "low" | "medium" | "high" | "urgent", "reason": "one short sentence explaining why"}

Task title: ${title}
Task description: ${description || "(none)"}`;

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    const allowed = ["low", "medium", "high", "urgent"];
    if (!allowed.includes(parsed.priority)) parsed.priority = "medium";
    return parsed;
  } catch {
    return { priority: "medium", reason: "Could not parse AI response, defaulted to medium." };
  }
};

/**
 * Generates a short sprint/board summary from a list of cards grouped by list.
 */
export const generateSprintSummary = async (boardTitle, listsWithCards) => {
  const boardSnapshot = listsWithCards
    .map(
      (l) =>
        `${l.title} (${l.cards.length} cards):\n` +
        l.cards.map((c) => `  - [${c.priority}] ${c.title}`).join("\n")
    )
    .join("\n\n");

  const prompt = `You are a project management assistant. Summarize the current state of this sprint board for a stand-up update.
Board: ${boardTitle}

${boardSnapshot}

Write a concise summary (max 150 words) covering: overall progress, any high/urgent priority items that need attention, and one suggestion for the team. Plain text only, no markdown headers.`;

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 400,
  });

  return completion.choices[0]?.message?.content?.trim() || "Summary unavailable.";
};
