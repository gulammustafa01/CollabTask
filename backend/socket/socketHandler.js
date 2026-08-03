import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";

// boardId -> Map<userId, { name, avatarColor, socketId }>
const presence = new Map();

const broadcastPresence = (io, boardId) => {
  const members = Array.from(presence.get(boardId)?.values() || []);
  io.to(`board:${boardId}`).emit("presence:update", members);
};

export const initSocket = (io) => {
  // Auth every socket connection via JWT (sent in handshake auth)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      socket.user = { id: user._id.toString(), name: user.name, avatarColor: user.avatarColor };
      next();
    } catch (err) {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    let joinedBoards = new Set();

    socket.on("board:join", (boardId) => {
      socket.join(`board:${boardId}`);
      joinedBoards.add(boardId);

      if (!presence.has(boardId)) presence.set(boardId, new Map());
      presence.get(boardId).set(socket.user.id, {
        id: socket.user.id,
        name: socket.user.name,
        avatarColor: socket.user.avatarColor,
        socketId: socket.id,
      });
      broadcastPresence(io, boardId);
    });

    socket.on("board:leave", (boardId) => {
      socket.leave(`board:${boardId}`);
      joinedBoards.delete(boardId);
      presence.get(boardId)?.delete(socket.user.id);
      broadcastPresence(io, boardId);
    });

    // Lightweight "user is dragging a card" cursor-style indicator
    socket.on("card:dragging", ({ boardId, cardId }) => {
      socket.to(`board:${boardId}`).emit("card:dragging", { cardId, user: socket.user });
    });

    socket.on("disconnect", () => {
      joinedBoards.forEach((boardId) => {
        presence.get(boardId)?.delete(socket.user.id);
        broadcastPresence(io, boardId);
      });
    });
  });
};
