import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const PRIORITIES = ["low", "medium", "high", "urgent"];

export default function CardModal({ boardId, card, canEdit, socket, onClose, onUpdated, onDeleted }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : "");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/boards/${boardId}/cards/${card._id}/comments`)
      .then(({ data }) => setComments(data))
      .finally(() => setCommentsLoading(false));
  }, [boardId, card._id]);

  // Live comments from other users while this modal is open
  useEffect(() => {
    if (!socket) return;
    const onNew = (comment) => {
      if (comment.card !== card._id) return;
      setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]));
    };
    const onDeleted = ({ commentId, cardId }) => {
      if (cardId !== card._id) return;
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    };
    socket.on("comment:new", onNew);
    socket.on("comment:deleted", onDeleted);
    return () => {
      socket.off("comment:new", onNew);
      socket.off("comment:deleted", onDeleted);
    };
  }, [socket, card._id]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/boards/${boardId}/cards/${card._id}`, {
        title,
        description,
        priority,
        dueDate: dueDate || null,
      });
      onUpdated(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const suggestPriority = async () => {
    setAiLoading(true);
    setAiReason("");
    try {
      const { data } = await api.post(`/ai/${boardId}/suggest-priority`, { title, description });
      setPriority(data.priority);
      setAiReason(data.reason);
    } catch (err) {
      setAiReason("AI suggestion failed — check GROQ_API_KEY on the server.");
    } finally {
      setAiLoading(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this card?")) return;
    await api.delete(`/boards/${boardId}/cards/${card._id}`);
    onDeleted(card._id);
    onClose();
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const { data } = await api.post(`/boards/${boardId}/cards/${card._id}/comments`, { text: commentText.trim() });
    setComments((prev) => [...prev, data]);
    setCommentText("");
  };

  const removeComment = async (commentId) => {
    await api.delete(`/boards/${boardId}/cards/${card._id}/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c._id !== commentId));
  };

  return (
    <div className="fixed inset-0 bg-[--overlay] flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-panel border border-border rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <input
          disabled={!canEdit}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent text-lg font-display font-medium text-text outline-none border-b border-transparent focus:border-accent"
        />
        <textarea
          disabled={!canEdit}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description…"
          rows={4}
          className="w-full bg-panel2 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent resize-none"
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Priority</label>
            <select
              disabled={!canEdit}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-panel2 border border-border rounded-lg px-2 py-1 text-sm outline-none"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted">Due</label>
            <input
              type="date"
              disabled={!canEdit}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-panel2 border border-border rounded-lg px-2 py-1 text-sm outline-none font-data"
            />
          </div>

          {canEdit && (
            <button
              onClick={suggestPriority}
              disabled={aiLoading || !title}
              className="text-xs bg-accent2/20 text-accent2 border border-accent2/40 rounded-lg px-2 py-1 hover:bg-accent2/30 disabled:opacity-50"
            >
              {aiLoading ? "Thinking…" : "✨ AI suggest"}
            </button>
          )}
        </div>

        {aiReason && <p className="text-xs text-muted italic">{aiReason}</p>}

        <div className="flex justify-between pt-1 border-t border-border pt-3">
          {canEdit ? (
            <button onClick={remove} className="text-sm text-urgent hover:opacity-80">
              Delete card
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm text-muted px-3 py-1.5">
              Close
            </button>
            {canEdit && (
              <button onClick={save} disabled={saving} className="text-sm bg-accent hover:bg-accent2 text-white rounded-lg px-4 py-1.5 font-medium">
                {saving ? "Saving…" : "Save"}
              </button>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="pt-3 border-t border-border space-y-3">
          <h4 className="text-xs uppercase tracking-wide text-muted font-data">Comments</h4>

          {commentsLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted">No comments yet.</p>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c._id} className="flex gap-2 text-sm">
                  <div
                    className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] mt-0.5"
                    style={{ background: c.author?.avatarColor }}
                  >
                    {c.author?.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-text font-medium text-xs">{c.author?.name}</span>
                      <span className="font-data text-[10px] text-muted">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-text/90 mt-0.5">{c.text}</p>
                    {c.author?._id === user?.id && (
                      <button onClick={() => removeComment(c._id)} className="text-[10px] text-muted hover:text-urgent mt-0.5">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <form onSubmit={postComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment…"
                className="flex-1 bg-panel2 border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
              />
              <button className="text-sm bg-accent hover:bg-accent2 text-white rounded-lg px-3 py-1.5">Post</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
