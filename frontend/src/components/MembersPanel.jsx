import { useState } from "react";
import api from "../api/axios.js";

export default function MembersPanel({ boardId, members, onlineIds, isOwner, onMemberAdded }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const invite = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post(`/boards/${boardId}/members`, { email, role });
      setEmail("");
      onMemberAdded();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.user._id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px]"
                  style={{ background: m.user.avatarColor }}
                >
                  {m.user.name?.[0]?.toUpperCase()}
                </div>
                {onlineIds.has(m.user._id) && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-panel" />
                )}
              </div>
              <span className="text-text">{m.user.name}</span>
            </div>
            <span className="text-xs text-muted capitalize">{m.role}</span>
          </div>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={invite} className="space-y-2 pt-3 border-t border-border">
          <p className="text-xs text-muted">Invite a member</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <input
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-panel2 border border-border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-panel2 border border-border rounded-lg px-2 py-1.5 text-sm outline-none"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button disabled={busy} className="w-full bg-accent hover:bg-accent2 text-white rounded-lg py-1.5 text-sm font-medium disabled:opacity-50">
            {busy ? "Adding…" : "Add member"}
          </button>
        </form>
      )}
    </div>
  );
}
