import { useState } from "react";
import api from "../api/axios.js";

export default function SprintSummaryPanel({ boardId }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/ai/${boardId}/sprint-summary`);
      setSummary(data.summary);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate summary — check GROQ_API_KEY on server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={generate}
        disabled={loading}
        className="w-full bg-accent2/20 text-accent2 border border-accent2/40 rounded-lg py-2 text-sm hover:bg-accent2/30 disabled:opacity-50"
      >
        {loading ? "Generating…" : "✨ Generate AI sprint summary"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {summary && <p className="text-sm text-text leading-relaxed whitespace-pre-line bg-panel2 border border-border rounded-lg p-3">{summary}</p>}
    </div>
  );
}
