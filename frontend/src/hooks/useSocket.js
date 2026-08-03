import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

/**
 * Connects once per boardId, authenticates with JWT, and joins the board room.
 * Returns a ref to the live socket instance so components can emit events.
 */
export const useSocket = (boardId) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!boardId) return;
    const token = localStorage.getItem("ct_token");
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("board:join", boardId));

    return () => {
      socket.emit("board:leave", boardId);
      socket.disconnect();
    };
  }, [boardId]);

  return socketRef;
};
