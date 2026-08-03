import express from "express";
import Card from "../models/Card.js";
import List from "../models/List.js";
import { protect } from "../middleware/auth.js";
import { requireBoardRole } from "../middleware/rbac.js";
import { suggestPriority, generateSprintSummary } from "../utils/groq.js";

const router = express.Router();
router.use(protect);

// AI: suggest priority for a task title/description (does not require an existing card)
router.post("/:boardId/suggest-priority", requireBoardRole("editor"), async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const suggestion = await suggestPriority(title, description);
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ message: "AI suggestion failed", error: err.message });
  }
});

// AI: generate a sprint/board summary for standups
router.get("/:boardId/sprint-summary", requireBoardRole("viewer"), async (req, res) => {
  try {
    const lists = await List.find({ board: req.board._id }).sort({ order: 1 });
    const cards = await Card.find({ board: req.board._id });

    const listsWithCards = lists.map((l) => ({
      title: l.title,
      cards: cards.filter((c) => c.list.toString() === l._id.toString()),
    }));

    const summary = await generateSprintSummary(req.board.title, listsWithCards);
    res.json({ summary, generatedAt: new Date() });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate summary", error: err.message });
  }
});

export default router;
