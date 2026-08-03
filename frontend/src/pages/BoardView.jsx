import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import api from "../api/axios.js";
import { useSocket } from "../hooks/useSocket.js";
import { useAuth } from "../context/AuthContext.jsx";
import ListColumn from "../components/ListColumn.jsx";
import CardModal from "../components/CardModal.jsx";
import ActivityFeed from "../components/ActivityFeed.jsx";
import MembersPanel from "../components/MembersPanel.jsx";
import SprintSummaryPanel from "../components/SprintSummaryPanel.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

const TABS = ["Members", "Activity", "AI Summary"];

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socketRef = useSocket(boardId);

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [myRole, setMyRole] = useState("viewer");
  const [activeCard, setActiveCard] = useState(null);
  const [logs, setLogs] = useState([]);
  const [online, setOnline] = useState([]);
  const [draggingUsers, setDraggingUsers] = useState({});
  const [tab, setTab] = useState("Members");
  const [newListTitle, setNewListTitle] = useState("");
  const [addingList, setAddingList] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const canEdit = myRole === "editor" || myRole === "owner";
  const isOwner = myRole === "owner";

  const loadBoard = useCallback(async () => {
    try {
      const { data } = await api.get(`/boards/${boardId}`);
      setBoard(data.board);
      setLists(data.lists);
      setCards(data.cards);
      setMyRole(data.myRole);
    } catch (err) {
      navigate("/");
    }
  }, [boardId, navigate]);

  const loadActivity = useCallback(async () => {
    const { data } = await api.get(`/boards/${boardId}/activity`);
    setLogs(data);
  }, [boardId]);

  useEffect(() => {
    loadBoard();
    loadActivity();
  }, [loadBoard, loadActivity]);

  // ---- Real-time listeners ----
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onCardCreated = (card) => setCards((prev) => [...prev, card]);
    const onCardUpdated = (card) => setCards((prev) => prev.map((c) => (c._id === card._id ? card : c)));
    const onCardDeleted = ({ cardId }) => setCards((prev) => prev.filter((c) => c._id !== cardId));
    const onCardMoved = ({ cardId, toListId, toOrder }) =>
      setCards((prev) => prev.map((c) => (c._id === cardId ? { ...c, list: toListId, order: toOrder } : c)));
    const onListCreated = (list) => setLists((prev) => [...prev, list]);
    const onListDeleted = ({ listId }) => setLists((prev) => prev.filter((l) => l._id !== listId));
    const onListReordered = ({ orderedListIds }) =>
      setLists((prev) => {
        const byId = Object.fromEntries(prev.map((l) => [l._id, l]));
        return orderedListIds.map((id, order) => ({ ...byId[id], order })).filter(Boolean);
      });
    const onActivity = (entry) => setLogs((prev) => [entry, ...prev].slice(0, 50));
    const onPresence = (members) => setOnline(members);
    const onMemberAdded = () => loadBoard();
    const onDragging = ({ cardId, user: dragger }) => {
      setDraggingUsers((prev) => ({ ...prev, [cardId]: dragger.name }));
      setTimeout(() => setDraggingUsers((prev) => ({ ...prev, [cardId]: undefined })), 2000);
    };

    socket.on("card:created", onCardCreated);
    socket.on("card:updated", onCardUpdated);
    socket.on("card:deleted", onCardDeleted);
    socket.on("card:moved", onCardMoved);
    socket.on("list:created", onListCreated);
    socket.on("list:deleted", onListDeleted);
    socket.on("list:reordered", onListReordered);
    socket.on("activity:new", onActivity);
    socket.on("presence:update", onPresence);
    socket.on("board:memberAdded", onMemberAdded);
    socket.on("card:dragging", onDragging);

    return () => {
      socket.off("card:created", onCardCreated);
      socket.off("card:updated", onCardUpdated);
      socket.off("card:deleted", onCardDeleted);
      socket.off("card:moved", onCardMoved);
      socket.off("list:created", onListCreated);
      socket.off("list:deleted", onListDeleted);
      socket.off("list:reordered", onListReordered);
      socket.off("activity:new", onActivity);
      socket.off("presence:update", onPresence);
      socket.off("board:memberAdded", onMemberAdded);
      socket.off("card:dragging", onDragging);
    };
  }, [socketRef, loadBoard]);

  const sortedLists = useMemo(() => lists.slice().sort((a, b) => a.order - b.order), [lists]);

  const cardsByList = useMemo(() => {
    const map = {};
    lists.forEach((l) => (map[l._id] = []));
    cards
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((c) => {
        if (!map[c.list]) map[c.list] = [];
        map[c.list].push(c);
      });
    return map;
  }, [lists, cards]);

  const onDragStart = (start) => {
    if (start.type === "CARD") {
      socketRef.current?.emit("card:dragging", { boardId, cardId: start.draggableId });
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === "LIST") {
      const reordered = sortedLists.slice();
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const withOrder = reordered.map((l, i) => ({ ...l, order: i }));
      setLists(withOrder);

      try {
        await api.patch(`/boards/${boardId}/lists/reorder`, {
          orderedListIds: withOrder.map((l) => l._id),
        });
      } catch (err) {
        loadBoard();
      }
      return;
    }

    // Card move — optimistic update
    setCards((prev) => {
      const moved = prev.find((c) => c._id === draggableId);
      if (!moved) return prev;
      const rest = prev.filter((c) => c._id !== draggableId);
      const updated = { ...moved, list: destination.droppableId, order: destination.index };
      return [...rest, updated];
    });

    try {
      await api.patch(`/boards/${boardId}/cards/${draggableId}/move`, {
        toListId: destination.droppableId,
        toOrder: destination.index,
      });
    } catch (err) {
      loadBoard(); // rollback on failure
    }
  };

  const addCard = async (listId, title) => {
    await api.post(`/boards/${boardId}/cards`, { title, listId });
  };

  const addList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    await api.post(`/boards/${boardId}/lists`, { title: newListTitle.trim() });
    setNewListTitle("");
    setAddingList(false);
  };

  const deleteList = async (listId) => {
    if (!confirm("Delete this list and all its cards?")) return;
    await api.delete(`/boards/${boardId}/lists/${listId}`);
  };

  const onlineIds = useMemo(() => new Set(online.map((m) => m.id)), [online]);

  if (!board) return <div className="h-screen flex items-center justify-center text-muted">Loading board…</div>;

  return (
    <div className="h-screen flex flex-col bg-bg">
      <header className="border-b border-border px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button onClick={() => navigate("/")} className="text-muted hover:text-text text-sm shrink-0">
            ← Boards
          </button>
          <h1 className="font-display font-semibold text-text truncate">{board.title}</h1>
          <span className="font-data text-xs text-muted border border-border rounded-full px-2 py-0.5 capitalize shrink-0">{myRole}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex -space-x-2">
            {online.map((m) => (
              <div
                key={m.id}
                title={m.name}
                className="w-7 h-7 rounded-full border-2 border-bg flex items-center justify-center text-xs"
                style={{ background: m.avatarColor }}
              >
                {m.name?.[0]?.toUpperCase()}
              </div>
            ))}
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg border border-border bg-panel2 flex items-center justify-center text-muted"
            aria-label="Open board panel"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-x-auto p-4">
          <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <Droppable droppableId="all-lists" type="LIST" direction="horizontal">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="flex gap-4 h-full">
                  {sortedLists.map((list, index) => (
                    <ListColumn
                      key={list._id}
                      list={list}
                      index={index}
                      cards={cardsByList[list._id] || []}
                      canEdit={canEdit}
                      onOpenCard={setActiveCard}
                      onAddCard={addCard}
                      onDeleteList={deleteList}
                      draggingUsers={draggingUsers}
                    />
                  ))}
                  {provided.placeholder}

                  {canEdit && (
                    <div className="w-72 shrink-0">
                      {addingList ? (
                        <form onSubmit={addList} className="bg-panel border border-border rounded-xl p-3 space-y-2">
                          <input
                            autoFocus
                            value={newListTitle}
                            onChange={(e) => setNewListTitle(e.target.value)}
                            placeholder="List title…"
                            className="w-full bg-panel2 border border-border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent"
                          />
                          <div className="flex gap-2">
                            <button className="text-xs bg-accent hover:bg-accent2 text-white rounded px-3 py-1">Add list</button>
                            <button type="button" onClick={() => setAddingList(false)} className="text-xs text-muted">
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAddingList(true)}
                          className="w-full text-sm text-muted hover:text-text border border-dashed border-border rounded-xl py-3"
                        >
                          + Add another list
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 bg-[--overlay] z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside
          className={`fixed md:static top-0 right-0 h-full z-40 md:z-auto w-72 shrink-0 border-l border-border bg-panel p-4 overflow-y-auto transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
          }`}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden mb-3 text-sm text-muted hover:text-text"
          >
            ✕ Close
          </button>

          <div className="flex gap-1 mb-4 bg-panel2 rounded-lg p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 text-xs py-1.5 rounded-md transition ${
                  tab === t ? "bg-accent text-white" : "text-muted hover:text-text"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Members" && (
            <MembersPanel boardId={boardId} members={board.members} onlineIds={onlineIds} isOwner={isOwner} onMemberAdded={loadBoard} />
          )}
          {tab === "Activity" && <ActivityFeed logs={logs} />}
          {tab === "AI Summary" && <SprintSummaryPanel boardId={boardId} />}
        </aside>
      </div>

      {activeCard && (
        <CardModal
          boardId={boardId}
          card={activeCard}
          canEdit={canEdit}
          socket={socketRef.current}
          onClose={() => setActiveCard(null)}
          onUpdated={(c) => setCards((prev) => prev.map((x) => (x._id === c._id ? c : x)))}
          onDeleted={(id) => setCards((prev) => prev.filter((x) => x._id !== id))}
        />
      )}
    </div>
  );
}
