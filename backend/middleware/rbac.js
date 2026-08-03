import Board from "../models/Board.js";

// Role hierarchy: owner > editor > viewer
const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };

/**
 * requireBoardRole("editor") -> user must be editor or owner on the board
 * Attaches req.board and req.memberRole for downstream handlers.
 * Expects board id in req.params.boardId (or req.body.boardId as fallback).
 */
export const requireBoardRole = (minRole) => {
  return async (req, res, next) => {
    try {
      const boardId = req.params.boardId || req.body.boardId;
      if (!boardId) return res.status(400).json({ message: "boardId required" });

      const board = await Board.findById(boardId);
      if (!board) return res.status(404).json({ message: "Board not found" });

      const member = board.members.find((m) => m.user.toString() === req.user._id.toString());
      if (!member) return res.status(403).json({ message: "You are not a member of this board" });

      if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
        return res.status(403).json({ message: `Requires ${minRole} role or higher` });
      }

      req.board = board;
      req.memberRole = member.role;
      next();
    } catch (err) {
      res.status(500).json({ message: "RBAC check failed", error: err.message });
    }
  };
};

export { ROLE_RANK };
