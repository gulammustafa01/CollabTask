import express from "express";
import Board from "../models/Board.js";
import List from "../models/List.js";
import Card from "../models/Card.js";
import Comment from "../models/Comment.js";
import ActivityLog from "../models/ActivityLog.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";
import { requireBoardRole } from "../middleware/rbac.js";

const router = express.Router();
router.use(protect);

const logActivity = async (io, boardId, userId, action, message, meta = {}) => {
  const entry = await ActivityLog.create({ board: boardId, user: userId, action, message, meta });
  const populated = await entry.populate("user", "name avatarColor");
  io.to(`board:${boardId}`).emit("activity:new", populated);
  return populated;
};

// ---------- BOARDS ----------

// Create board (creator becomes owner)
router.post("/", async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const board = await Board.create({
      title,
      description,
      owner: req.user._id,
      members: [{ user: req.user._id, role: "owner" }],
    });

    // seed default lists (Trello-style)
    const defaultLists = ["To Do", "In Progress", "Done"];
    await List.insertMany(defaultLists.map((title, i) => ({ board: board._id, title, order: i })));

    res.status(201).json(board);
  } catch (err) {
    res.status(500).json({ message: "Failed to create board", error: err.message });
  }
});

// List all boards current user is a member of
router.get("/", async (req, res) => {
  const boards = await Board.find({ "members.user": req.user._id })
    .populate("members.user", "name email avatarColor")
    .sort({ updatedAt: -1 });
  res.json(boards);
});

// Get single board with lists + cards
router.get("/:boardId", requireBoardRole("viewer"), async (req, res) => {
  const lists = await List.find({ board: req.board._id }).sort({ order: 1 });
  const cards = await Card.find({ board: req.board._id })
    .populate("assignees", "name avatarColor")
    .sort({ order: 1 });
  const populatedBoard = await req.board.populate("members.user", "name email avatarColor");
  res.json({ board: populatedBoard, lists, cards, myRole: req.memberRole });
});

// Invite / add member by email (owner only)
router.post("/:boardId/members", requireBoardRole("owner"), async (req, res) => {
  try {
    const { email, role = "editor" } = req.body;
    if (!["editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "role must be editor or viewer" });
    }
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: "No user found with that email" });

    const alreadyMember = req.board.members.some((m) => m.user.toString() === user._id.toString());
    if (alreadyMember) return res.status(409).json({ message: "User is already a member" });

    req.board.members.push({ user: user._id, role });
    await req.board.save();

    const io = req.app.get("io");
    await logActivity(io, req.board._id, req.user._id, "member.added", `${req.user.name} added ${user.name} as ${role}`);
    io.to(`board:${req.board._id}`).emit("board:memberAdded", { user: { id: user._id, name: user.name, email: user.email, avatarColor: user.avatarColor }, role });

    res.status(201).json({ message: "Member added" });
  } catch (err) {
    res.status(500).json({ message: "Failed to add member", error: err.message });
  }
});

// Change a member's role (owner only)
router.patch("/:boardId/members/:userId", requireBoardRole("owner"), async (req, res) => {
  const { role } = req.body;
  if (!["owner", "editor", "viewer"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  const member = req.board.members.find((m) => m.user.toString() === req.params.userId);
  if (!member) return res.status(404).json({ message: "Member not found" });

  member.role = role;
  await req.board.save();

  const io = req.app.get("io");
  io.to(`board:${req.board._id}`).emit("board:memberRoleChanged", { userId: req.params.userId, role });
  await logActivity(io, req.board._id, req.user._id, "member.roleChanged", `${req.user.name} changed a member's role to ${role}`);

  res.json({ message: "Role updated" });
});

// ---------- LISTS ----------

router.post("/:boardId/lists", requireBoardRole("editor"), async (req, res) => {
  try {
    const { title } = req.body;
    const count = await List.countDocuments({ board: req.board._id });
    const list = await List.create({ board: req.board._id, title, order: count });

    const io = req.app.get("io");
    io.to(`board:${req.board._id}`).emit("list:created", list);
    await logActivity(io, req.board._id, req.user._id, "list.created", `${req.user.name} created list "${title}"`);

    res.status(201).json(list);
  } catch (err) {
    res.status(500).json({ message: "Failed to create list", error: err.message });
  }
});

router.delete("/:boardId/lists/:listId", requireBoardRole("editor"), async (req, res) => {
  await List.findByIdAndDelete(req.params.listId);
  await Card.deleteMany({ list: req.params.listId });

  const io = req.app.get("io");
  io.to(`board:${req.board._id}`).emit("list:deleted", { listId: req.params.listId });
  await logActivity(io, req.board._id, req.user._id, "list.deleted", `${req.user.name} deleted a list`);

  res.json({ message: "List deleted" });
});

// Reorder lists (drag-and-drop of columns themselves). Body: { orderedListIds: [id1, id2, ...] }
router.patch("/:boardId/lists/reorder", requireBoardRole("editor"), async (req, res) => {
  try {
    const { orderedListIds } = req.body;
    if (!Array.isArray(orderedListIds)) {
      return res.status(400).json({ message: "orderedListIds array is required" });
    }

    await Promise.all(
      orderedListIds.map((listId, order) =>
        List.updateOne({ _id: listId, board: req.board._id }, { $set: { order } })
      )
    );

    const io = req.app.get("io");
    io.to(`board:${req.board._id}`).emit("list:reordered", { orderedListIds });

    res.json({ message: "Lists reordered" });
  } catch (err) {
    res.status(500).json({ message: "Failed to reorder lists", error: err.message });
  }
});

// ---------- CARDS ----------

router.post("/:boardId/cards", requireBoardRole("editor"), async (req, res) => {
  try {
    const { title, description, listId, priority } = req.body;
    const count = await Card.countDocuments({ list: listId });
    const card = await Card.create({
      board: req.board._id,
      list: listId,
      title,
      description,
      priority: priority || "medium",
      order: count,
      createdBy: req.user._id,
    });

    const io = req.app.get("io");
    io.to(`board:${req.board._id}`).emit("card:created", card);
    await logActivity(io, req.board._id, req.user._id, "card.created", `${req.user.name} created card "${title}"`);

    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ message: "Failed to create card", error: err.message });
  }
});

// Move / reorder card (drag-and-drop endpoint) — the real-time core
router.patch("/:boardId/cards/:cardId/move", requireBoardRole("editor"), async (req, res) => {
  try {
    const { toListId, toOrder } = req.body;
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    const fromListId = card.list.toString();
    card.list = toListId;
    card.order = toOrder;
    await card.save();

    const io = req.app.get("io");
    io.to(`board:${req.board._id}`).emit("card:moved", {
      cardId: card._id,
      fromListId,
      toListId,
      toOrder,
      movedBy: { id: req.user._id, name: req.user.name },
    });

    if (fromListId !== toListId) {
      await logActivity(io, req.board._id, req.user._id, "card.moved", `${req.user.name} moved "${card.title}"`);
    }

    res.json(card);
  } catch (err) {
    res.status(500).json({ message: "Failed to move card", error: err.message });
  }
});

router.patch("/:boardId/cards/:cardId", requireBoardRole("editor"), async (req, res) => {
  try {
    const updates = (({ title, description, priority, dueDate, assignees, aiSuggested }) => ({
      title,
      description,
      priority,
      dueDate,
      assignees,
      aiSuggested,
    }))(req.body);
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const card = await Card.findByIdAndUpdate(req.params.cardId, updates, { new: true }).populate(
      "assignees",
      "name avatarColor"
    );

    const io = req.app.get("io");
    io.to(`board:${req.board._id}`).emit("card:updated", card);

    res.json(card);
  } catch (err) {
    res.status(500).json({ message: "Failed to update card", error: err.message });
  }
});

router.delete("/:boardId/cards/:cardId", requireBoardRole("editor"), async (req, res) => {
  const card = await Card.findByIdAndDelete(req.params.cardId);
  await Comment.deleteMany({ card: req.params.cardId });

  const io = req.app.get("io");
  io.to(`board:${req.board._id}`).emit("card:deleted", { cardId: req.params.cardId });
  await logActivity(io, req.board._id, req.user._id, "card.deleted", `${req.user.name} deleted "${card?.title || "a card"}"`);

  res.json({ message: "Card deleted" });
});

// ---------- COMMENTS ----------

router.get("/:boardId/cards/:cardId/comments", requireBoardRole("viewer"), async (req, res) => {
  const comments = await Comment.find({ card: req.params.cardId })
    .populate("author", "name avatarColor")
    .sort({ createdAt: 1 });
  res.json(comments);
});

router.post("/:boardId/cards/:cardId/comments", requireBoardRole("editor"), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text is required" });

    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: "Card not found" });

    const comment = await Comment.create({
      card: req.params.cardId,
      board: req.board._id,
      author: req.user._id,
      text: text.trim(),
    });
    const populated = await comment.populate("author", "name avatarColor");

    const io = req.app.get("io");
    io.to(`board:${req.board._id}`).emit("comment:new", populated);
    await logActivity(io, req.board._id, req.user._id, "comment.added", `${req.user.name} commented on "${card.title}"`);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to add comment", error: err.message });
  }
});

router.delete("/:boardId/cards/:cardId/comments/:commentId", requireBoardRole("editor"), async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ message: "Comment not found" });

  const isAuthor = comment.author.toString() === req.user._id.toString();
  if (!isAuthor && req.memberRole !== "owner") {
    return res.status(403).json({ message: "You can only delete your own comments" });
  }

  await comment.deleteOne();
  const io = req.app.get("io");
  io.to(`board:${req.board._id}`).emit("comment:deleted", { commentId: req.params.commentId, cardId: req.params.cardId });

  res.json({ message: "Comment deleted" });
});

// ---------- ACTIVITY LOG ----------

router.get("/:boardId/activity", requireBoardRole("viewer"), async (req, res) => {
  const logs = await ActivityLog.find({ board: req.board._id })
    .populate("user", "name avatarColor")
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(logs);
});

export default router;
