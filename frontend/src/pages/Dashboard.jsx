import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const loadBoards = async () => {
    const { data } = await api.get("/boards");
    setBoards(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBoards();
  }, []);

  const createBoard = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    const { data } = await api.post("/boards", { title });
    setBoards((prev) => [data, ...prev]);
    setTitle("");
    setShowModal(false);
    navigate(`/boards/${data._id}`);
  };

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-display font-semibold">
          Collab<span className="text-accent">Task</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{user?.name}</span>
          <ThemeToggle />
          <button onClick={logout} className="text-sm text-muted hover:text-text">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-text">Your boards</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-accent hover:bg-accent2 text-white transition rounded-lg px-4 py-2 text-sm font-medium"
          >
            + New board
          </button>
        </div>

        {loading ? (
          <p className="text-muted">Loading boards…</p>
        ) : boards.length === 0 ? (
          <p className="text-muted">No boards yet — create your first one.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {boards.map((b) => (
              <div
                key={b._id}
                onClick={() => navigate(`/boards/${b._id}`)}
                className="cursor-pointer bg-panel border border-border rounded-xl p-5 hover:border-accent transition"
              >
                <h3 className="font-medium text-text">{b.title}</h3>
                <p className="text-sm text-muted mt-1 line-clamp-2">{b.description || "No description"}</p>
                <div className="flex -space-x-2 mt-4">
                  {b.members.slice(0, 5).map((m) => (
                    <div
                      key={m.user._id}
                      title={`${m.user.name} (${m.role})`}
                      className="w-7 h-7 rounded-full border-2 border-panel flex items-center justify-center text-xs font-medium"
                      style={{ background: m.user.avatarColor }}
                    >
                      {m.user.name?.[0]?.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-[--overlay] flex items-center justify-center" onClick={() => setShowModal(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={createBoard}
            className="bg-panel border border-border rounded-xl p-6 w-full max-w-sm space-y-4"
          >
            <h3 className="font-medium text-text">New board</h3>
            <input
              autoFocus
              placeholder="Board title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-panel2 border border-border rounded-lg px-3 py-2 outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-muted">
                Cancel
              </button>
              <button className="px-4 py-2 text-sm bg-accent hover:bg-accent2 text-white rounded-lg font-medium">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
